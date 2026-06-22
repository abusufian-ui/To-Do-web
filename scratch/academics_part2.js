    await Promise.all([Grade.deleteMany({ userId: req.user.id }), ResultHistory.deleteMany({ userId: req.user.id }), StudentStats.deleteMany({ userId: req.user.id }), Timetable.deleteMany({ userId: req.user.id }), Course.deleteMany({ userId: req.user.id, type: 'university' })]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.get('/api/user/portal-status', auth, async (req, res) => { try { const user = await User.findById(req.user.id); res.json({ isConnected: !!user.portalId && user.isPortalConnected, portalId: user.portalId }); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.get('/api/timetable', auth, async (req, res) => { try { const now = new Date(); res.json((await Timetable.find({ userId: req.user.id, $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] })).map(i => ({ ...i.toObject(), id: i._id }))); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.get('/api/student-stats', auth, async (req, res) => { try { res.json(await StudentStats.findOne({ userId: req.user.id }) || { cgpa: "0.00", credits: "0", inprogressCr: "0" }); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.get('/api/grades', auth, async (req, res) => { try { res.json(await Grade.find({ userId: req.user.id }).sort({ lastUpdated: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.get('/api/results-history', auth, async (req, res) => { try { res.json(await ResultHistory.find({ userId: req.user.id }).sort({ lastUpdated: 1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.get('/api/sync-diagnostics/users', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    const connectedUsers = await User.find({})
      .select('_id name email portalId isPortalConnected')
      .sort({ name: 1 });
    res.json(connectedUsers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching connected users" });
  }
});

app.get('/api/sync-diagnostics', auth, async (req, res) => {
  try {
    let targetUserId = req.user.id;
    
    if (req.query.targetUserId) {
      const requester = await User.findById(req.user.id);
      if (requester.isAdmin) {
        targetUserId = req.query.targetUserId;
      }
    }

    const [attendance, announcements, submissions, grades, timetable, syncLogs, courses, studentStats, userInfo] = await Promise.all([
      Attendance.find({ userId: targetUserId }),
      Announcement.find({ userId: targetUserId }),
      Submission.find({ userId: targetUserId }),
      Grade.find({ userId: targetUserId }),
      Timetable.find({ userId: targetUserId }),
      SyncLog.find({ userId: targetUserId }).sort({ startTime: -1 }).limit(20),
      Course.find({ userId: targetUserId }),
      StudentStats.findOne({ userId: targetUserId }),
      User.findById(targetUserId).select('-password')
    ]);
    res.json({
      attendance,
      announcements,
      submissions,
      grades,
      timetable,
      syncLogs,
      courses,
      studentStats,
      user: userInfo
    });
  } catch (error) {
    console.error("Diagnostic error:", error);
    res.status(500).json({ message: "Error fetching diagnostic data" });
  }
});

app.get('/api/focus-sessions', auth, async (req, res) => { try { res.json(await FocusSession.find({ userId: req.user.id }).sort({ completedAt: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/focus-sessions', auth, async (req, res) => { try { res.json(await new FocusSession({ ...req.body, userId: req.user.id }).save()); } catch (error) { res.status(500).json({ message: "Error" }); } });




async function broadcastLiveUpdate(groupId, activeUserId) {
  
  io.to(activeUserId.toString()).emit('live_db_update');
  
  
  if (groupId) {
    const group = await Group.findById(groupId);
    if (group) {
      group.members.forEach(memberId => {
        io.to(memberId.toString()).emit('live_db_update');
      });
    }
  }
}




app.get('/api/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.put('/api/notifications/read', auth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { $set: { isRead: true } });
    await broadcastLiveUpdate(null, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.put('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, userId: req.user.id });
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    notification.isRead = true;
    await notification.save();
    await broadcastLiveUpdate(null, req.user.id);
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.delete('/api/notifications/:id', auth, async (req, res) => {
  try {
    const result = await Notification.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Notification not found" });
    await broadcastLiveUpdate(null, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

const createGroupNotification = async (groupId, senderId, type, title, message, link) => {
  if (!groupId) return;
  try {
    const group = await Group.findById(groupId);
    if (!group) return;
    const sender = await User.findById(senderId);
    
    const memberIds = group.members.filter(m => m.toString() !== senderId.toString());
    const notifications = memberIds.map(memberId => ({
      userId: memberId,
      type,
      title,
      message,
      sender: sender ? { name: sender.name, profilePic: sender.profilePic, id: sender._id } : {},
      link
    }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      
      
      const usersToPush = await User.find({ _id: { $in: memberIds } });
      for (const u of usersToPush) {
        await sendPush(u, title, message, { link, type, senderName: sender?.name }, "smart-alert", "default");
      }
    }
  } catch (error) {
    console.error("Failed to create notifications", error);
  }
};

const createAcademicNotification = async (userId, type, title, message, link = '') => {
  if (!userId) return;
  try {
    const notification = new Notification({
      userId,
      type, 
      title,
      message,
      link,
      isRead: false
    });
    await notification.save();
    
    
    io.to(userId.toString()).emit('live_db_update');
  } catch (error) {
    console.error("Failed to create academic notification", error);
  }
};








app.get('/api/tasks', auth, async (req, res) => {
  try {
    const userGroups = await Group.find({ members: req.user.id });
    const groupIds = userGroups.map(g => g._id);

    const tasks = await Task.find({
      $or: [
        { userId: req.user.id, groupId: null, isDeleted: false }, 
        { groupId: { $in: groupIds }, isDeleted: false, deletedByUsers: { $ne: req.user.id } } 
      ]
    })
    .populate('userId', 'name email profilePic')
    .sort({ createdAt: -1 });

    
    const localizedTasks = tasks.map(task => {
      const taskObj = task.toObject();
      if (taskObj.groupId) {
        const personalStatusOverride = taskObj.memberStatuses?.find(ms => ms.userId.toString() === req.user.id);
        if (personalStatusOverride) {
          taskObj.status = personalStatusOverride.status;
        }
      }
      return taskObj;
    });

    res.json(localizedTasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/tasks', auth, async (req, res) => {
  try {
    const task = new Task({ ...req.body, userId: req.user.id });
    await task.save();
    
    if (task.groupId) {
      await createGroupNotification(task.groupId, req.user.id, 'task', 'New Group Task', `A new task "${task.title}" was added to the group.`);
    }
    
    await broadcastLiveUpdate(task.groupId, req.user.id);
    res.json(await Task.findById(task._id).populate('userId', 'name email profilePic'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    
    const isCreator = task.userId.toString() === req.user.id;

    let isMember = false;
    if (task.groupId) {
      const group = await Group.findById(task.groupId);
      if (group && group.members.map(m => m.toString()).includes(req.user.id)) {
        isMember = true;
      }
    }

    if (!isCreator && !isMember) {
      return res.status(403).json({ message: "Unauthorized interaction with workspace task." });
    }

    
    if (isCreator) {
      const targetPrivacy = req.body.isPrivate;

      if (targetPrivacy === true && task.groupId !== null) {
        task.groupId = null;
        task.memberStatuses = [];
        task.deletedByUsers = [];
      } else if (targetPrivacy === false && !task.groupId) {
        const userGroup = await Group.findOne({ members: req.user.id });
        if (!userGroup) return res.status(400).json({ message: "You must join a group before sharing this task." });
        task.groupId = userGroup._id;
        await createGroupNotification(task.groupId, req.user.id, 'task', 'Task Shared', `A task "${task.title}" was made public to the group.`);
      }

      Object.assign(task, req.body);

      if (req.body.status !== undefined) {
        const existingIdx = task.memberStatuses.findIndex(ms => ms.userId.toString() === req.user.id);
        if (existingIdx > -1) task.memberStatuses[existingIdx].status = req.body.status;
        else task.memberStatuses.push({ userId: req.user.id, status: req.body.status });
      }
    } 
    
    else {
      
      const allowedKeys = ['status', 'acknowledged']; 
      const modifications = Object.keys(req.body);
      const isViolatingPermissions = modifications.some(key => !allowedKeys.includes(key));

      if (isViolatingPermissions) {
        return res.status(403).json({ message: "Permissions Denied: Group members are limited to changing status only." });
      }

      if (req.body.status !== undefined) {
        const existingIdx = task.memberStatuses.findIndex(ms => ms.userId.toString() === req.user.id);
        if (existingIdx > -1) {
          task.memberStatuses[existingIdx].status = req.body.status;
        } else {
          task.memberStatuses.push({ userId: req.user.id, status: req.body.status });
        }
      }
    }

    await task.save();
    await broadcastLiveUpdate(task.groupId, req.user.id);
    
    const populatedTask = await Task.findById(task._id).populate('userId', 'name email profilePic');
    const taskObj = populatedTask.toObject();
    
    if (taskObj.groupId) {
      const personalStatusOverride = taskObj.memberStatuses.find(ms => ms.userId.toString() === req.user.id);
      if (personalStatusOverride) {
        taskObj.status = personalStatusOverride.status;
      }
    }

    res.json(taskObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/tasks/:id/acknowledge', auth, async (req, res) => {
  try {
    await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { acknowledged: true });
    await broadcastLiveUpdate(null, req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});


app.put('/api/tasks/:id/delete', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    
    const isCreator = task.userId.toString() === req.user.id;
    const oldGroupId = task.groupId;

    if (isCreator) {
      
      task.isDeleted = true;
      task.deletedAt = new Date();
    } else if (task.groupId) {
      
      if (!task.deletedByUsers.map(id => id.toString()).includes(req.user.id)) {
        task.deletedByUsers.push(req.user.id);
      }
    } else {
      return res.status(403).json({ message: "Unauthorized delete action." });
    }

    await task.save();
    await broadcastLiveUpdate(oldGroupId, req.user.id);
    res.json(task);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/tasks/:id/restore', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isCreator = task.userId.toString() === req.user.id;

    if (isCreator) {
      task.isDeleted = false;
      task.deletedAt = null;
    } 
    
    task.deletedByUsers = task.deletedByUsers.filter(id => id.toString() !== req.user.id);

    await task.save();
    await broadcastLiveUpdate(task.groupId, req.user.id);
    res.json(task);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isCreator = task.userId.toString() === req.user.id;
    const oldGroupId = task.groupId;

    if (isCreator) {
      await Task.findByIdAndDelete(req.params.id);
    } else {
      task.deletedByUsers.push(req.user.id);
      await task.save();
    }

    await broadcastLiveUpdate(oldGroupId, req.user.id);
    res.json({ message: "Purge structural process completed cleanly." });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/transactions', auth, async (req, res) => { try { res.json(await Transaction.find({ userId: req.user.id, isDeleted: false }).sort({ date: -1, createdAt: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/transactions', auth, async (req, res) => { try { const t = await new Transaction({ ...req.body, userId: req.user.id }).save(); await broadcastLiveUpdate(null, req.user.id); res.json(t); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.put('/api/transactions/:id/delete', auth, async (req, res) => { try { const t = await Transaction.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true, deletedAt: new Date() }, { new: true }); await broadcastLiveUpdate(null, req.user.id); res.json(t); } catch (err) { res.status(500).json({ message: err.message }) } });
app.put('/api/transactions/:id/restore', auth, async (req, res) => { try { const t = await Transaction.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true }); await broadcastLiveUpdate(null, req.user.id); res.json(t); } catch (err) { res.status(500).json({ message: err.message }) } });
app.delete('/api/transactions/:id', auth, async (req, res) => { try { await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id }); await broadcastLiveUpdate(null, req.user.id); res.json({ success: true }); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.get('/api/budgets', auth, async (req, res) => { try { res.json(await Budget.find({ userId: req.user.id })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/budgets', auth, async (req, res) => { try { const b = await Budget.findOneAndUpdate({ category: req.body.category, userId: req.user.id }, { limit: req.body.limit, userId: req.user.id }, { upsert: true, new: true }); await broadcastLiveUpdate(null, req.user.id); res.json(b); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.get('/api/habits/stats', auth, async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user.id, isDeleted: false });
    res.json({ total: habits.length });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.get('/api/habits', auth, async (req, res) => { try { res.json(await Habit.find({ userId: req.user.id, isDeleted: false }).sort({ createdAt: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/habits', auth, async (req, res) => { try { const h = await new Habit({ ...req.body, userId: req.user.id, startDate: new Date() }).save(); await broadcastLiveUpdate(null, req.user.id); res.json(h); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.put('/api/habits/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { ...req.body }, { new: true });
    await broadcastLiveUpdate(null, req.user.id);
    res.json(habit);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.put('/api/habits/:id/journal', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    habit.journal.push({ type: req.body.type, content: req.body.content, trigger: req.body.trigger, date: new Date() });
    await habit.save();
    await broadcastLiveUpdate(null, req.user.id);
    res.json(habit);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.put('/api/habits/:id/archive', auth, async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { archivedAt: new Date() }, { new: true });
    await broadcastLiveUpdate(null, req.user.id);
    res.json(habit);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.put('/api/habits/:id/delete', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    if (!habit) return res.status(404).json({ message: "Not found" });
    if (habit.name === 'Daily Namaz') return res.status(403).json({ message: "Cannot delete system habit." });
    habit.isDeleted = true;
    habit.deletedAt = new Date();
    await habit.save();
    await broadcastLiveUpdate(null, req.user.id);
    res.json(habit);
  } catch (err) { res.status(500).json({ message: err.message }) }
});
app.put('/api/habits/:id/restore', auth, async (req, res) => { try { const h = await Habit.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true }); await broadcastLiveUpdate(null, req.user.id); res.json(h); } catch (err) { res.status(500).json({ message: err.message }) } });
app.delete('/api/habits/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    if (!habit) return res.status(404).json({ message: "Not found" });
    if (habit.name === 'Daily Namaz') return res.status(403).json({ message: "Cannot delete system habit." });
    await Habit.findByIdAndDelete(req.params.id);
    await broadcastLiveUpdate(null, req.user.id);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.put('/api/habits/:id/reset', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    habit.startDate = new Date();
    habit.cheatDays = [];
    habit.totalRelapses = (habit.totalRelapses || 0) + 1;
    habit.journal.push({ type: 'relapse', content: req.body.note || 'Relapsed', trigger: req.body.trigger || 'Unknown', date: new Date() });
    await habit.save();
    await broadcastLiveUpdate(null, req.user.id);
    res.json(habit);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.put('/api/habits/:id/cheat', auth, async (req, res) => { try { const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id }); habit.cheatDays.push(new Date()); await habit.save(); await broadcastLiveUpdate(null, req.user.id); res.json(habit); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.put('/api/habits/:id/checkin', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    habit.checkIns.push(new Date());
    
    
    const uniqueDays = [...new Set(habit.checkIns.map(d => new Date(d).setHours(0, 0, 0, 0)))].sort((a,b) => b - a);
    let streak = 0;
    let currentDate = new Date().setHours(0,0,0,0);
    if (uniqueDays[0] !== currentDate) currentDate -= 86400000;
    for (const day of uniqueDays) {
      if (day === currentDate) { streak++; currentDate -= 86400000; }
      else if (day < currentDate) break;
    }
    
    if (streak > habit.longestStreak) habit.longestStreak = streak;
    
    
    const MILESTONES = [7, 21, 30, 60, 90, 100, 365];
    for (let m of MILESTONES) {
      if (streak >= m && !habit.milestones.find(mil => mil.days === m)) {
        habit.milestones.push({ days: m, achievedAt: new Date(), celebrated: false });
        habit.journal.push({ type: 'milestone', content: `Reached ${m} days streak!`, date: new Date() });
      }
    }
    
    await habit.save();
    await broadcastLiveUpdate(null, req.user.id);
    res.json(habit);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.get('/api/namaz/today', auth, async (req, res) => {
  try {
    const lahoreDateObj = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
    let todayStr = `${lahoreDateObj.getDate()}-${lahoreDateObj.getMonth() + 1}-${lahoreDateObj.getFullYear()}`;

    const times = await getLahorePrayerTimes(todayStr);
    if (!times) return res.status(500).json({ message: "API Error" });

    const currentMins = lahoreDateObj.getHours() * 60 + lahoreDateObj.getMinutes();
    const [fajrH, fajrM] = times.fajr.split(':').map(Number);
    const fajrMins = fajrH * 60 + fajrM;

    if (currentMins < fajrMins) {
      const yesterday = new Date(lahoreDateObj);
      yesterday.setDate(yesterday.getDate() - 1);
      todayStr = `${yesterday.getDate()}-${yesterday.getMonth() + 1}-${yesterday.getFullYear()}`;
    }

    let record = await NamazRecord.findOne({ userId: req.user.id, dateStr: todayStr });
    if (!record) record = new NamazRecord({ userId: req.user.id, dateStr: todayStr });

    let modified = false;
    const prayerOrder = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];

    for (let i = 0; i < prayerOrder.length; i++) {
      const pName = prayerOrder[i];
      const [h, m] = times[pName].split(':').map(Number);
      const pMins = h * 60 + m;

      let isPastPrayerTime = currentMins >= pMins || (pName === 'isha' && currentMins < fajrMins);

      if (isPastPrayerTime) {
        if (record.prayers[pName] === 'locked') {
          record.prayers[pName] = 'pending';
          modified = true;
        }

        if (i > 0) {
          const prevP = prayerOrder[i - 1];
          if (record.prayers[prevP] === 'pending') {
            record.prayers[prevP] = 'missed';
            modified = true;
          }
        }
      }
    }

    if (modified || record.isNew) await record.save();
    res.json(record);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/namaz/offer', auth, async (req, res) => {
  try {
    const lahoreDateObj = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
    let todayStr = `${lahoreDateObj.getDate()}-${lahoreDateObj.getMonth() + 1}-${lahoreDateObj.getFullYear()}`;

    const times = await getLahorePrayerTimes(todayStr);
    const currentMins = lahoreDateObj.getHours() * 60 + lahoreDateObj.getMinutes();
    const [fajrH, fajrM] = times.fajr.split(':').map(Number);

    if (currentMins < (fajrH * 60 + fajrM)) {
      const yesterday = new Date(lahoreDateObj);
      yesterday.setDate(yesterday.getDate() - 1);
      todayStr = `${yesterday.getDate()}-${yesterday.getMonth() + 1}-${yesterday.getFullYear()}`;
    }

    let record = await NamazRecord.findOne({ userId: req.user.id, dateStr: todayStr });
    if (!record) record = new NamazRecord({ userId: req.user.id, dateStr: todayStr });

    if (record.prayers[req.body.prayerName] === 'pending') record.prayers[req.body.prayerName] = 'offered';
    else if (record.prayers[req.body.prayerName] === 'missed' || record.prayers[req.body.prayerName] === 'locked') record.prayers[req.body.prayerName] = 'qazah';

    await record.save(); res.json(record);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/bin', auth, async (req, res) => {
  try {
    const userGroups = await Group.find({ members: req.user.id });
    const groupIds = userGroups.map(g => g._id);

    
    
    const tasks = await Task.find({
      $or: [
        { userId: req.user.id, isDeleted: true },
        { groupId: { $in: groupIds }, deletedByUsers: req.user.id }
      ]
    }).populate('userId', 'name email profilePic').lean();

    
    
    const notes = await Note.find({
      $or: [
        { user: req.user.id, isDeleted: true },
        { groupId: { $in: groupIds }, deletedByUsers: req.user.id }
      ]
    }).populate('user', 'name email profilePic').lean();

    const transactions = await Transaction.find({ userId: req.user.id, isDeleted: true }).lean();
    const habits = await Habit.find({ userId: req.user.id, isDeleted: true }).lean();
    const keynotes = await Keynote.find({ userId: req.user.id, isDeleted: true }).lean();
    
    res.json({ tasks, transactions, habits, notes, keynotes });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bin/restore-all', auth, async (req, res) => {
  try {
    const userGroups = await Group.find({ members: req.user.id });
    const groupIds = userGroups.map(g => g._id);

    await Task.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    await Task.updateMany({ groupId: { $in: groupIds }, deletedByUsers: req.user.id }, { $pull: { deletedByUsers: req.user.id } });

    await Note.updateMany({ user: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    await Note.updateMany({ groupId: { $in: groupIds }, deletedByUsers: req.user.id }, { $pull: { deletedByUsers: req.user.id } });

    await Transaction.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    await Habit.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    await Keynote.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    
    io.to(req.user.id.toString()).emit('live_db_update');
    res.json({ message: "Restored all items successfully." });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/bin/empty', auth, async (req, res) => {
  try {
    await Task.deleteMany({ userId: req.user.id, isDeleted: true });
    await Note.deleteMany({ user: req.user.id, isDeleted: true });
    await Transaction.deleteMany({ userId: req.user.id, isDeleted: true });
    await Habit.deleteMany({ userId: req.user.id, isDeleted: true });
    await Keynote.deleteMany({ userId: req.user.id, isDeleted: true });
    
    io.to(req.user.id.toString()).emit('live_db_update');
    res.json({ message: "Recycle bin emptied safely." });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/', (req, res) => { res.json({ message: "API is running 🚀" }); });





app.get('/api/community/users', auth, async (req, res) => {
  try {
    
    const users = await User.find({ _id: { $ne: req.user.id } }).select('name email profilePic');
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/notes/share', auth, async (req, res) => {
  try {
    const { noteIds, targetUserIds } = req.body;
    const notesToShare = await Note.find({ _id: { $in: noteIds } });
    
    const newNotes = [];
    const senderUser = await User.findById(req.user.id);

    for (let targetId of targetUserIds) {
      const targetUser = await User.findById(targetId);
      
      const notesCount = notesToShare.length;
      const notesStr = notesCount === 1 ? `"${notesToShare[0].title}"` : `${notesCount} notes`;
      const title = "Note Shared 📝";
      const message = `${senderUser?.name || 'A user'} shared ${notesStr} with you.`;

      for (let note of notesToShare) {
        
        const newNote = new Note({
          user: targetId,
          title: note.title,
          content: note.content,
          courseId: note.courseId,
          referenceFiles: note.referenceFiles,
          source: note.source,
          isPrivate: true, 
          groupId: null,
          isInbox: true,   
          sender: req.user.id
        });
        await newNote.save();
        newNotes.push(newNote);
      }

      if (targetUser && notesCount > 0) {
        
        if (typeof sendPush === 'function') {
          await sendPush(targetUser, title, message, { type: 'note' }, 'smart-alert', 'default');
        }
        
        
        const notification = new Notification({
          userId: targetId,
          type: 'note',
          title,
          message,
          sender: senderUser ? { name: senderUser.name, profilePic: senderUser.profilePic, id: senderUser._id } : {},
          isRead: false
        });
        await notification.save();
      }

      io.to(targetId.toString()).emit('live_db_update');
    }
    res.json({ success: true, count: newNotes.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/notes/:id/accept', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (note.user.toString() !== req.user.id) return res.status(403).json({ error: "Unauthorized" });
    
    note.isInbox = false; 
    await note.save();
    
    io.to(req.user.id.toString()).emit('live_db_update');
    res.json(await Note.findById(note._id).populate('user', 'name email profilePic').populate('sender', 'name profilePic'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});


app.put('/api/notes/:id', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found." });
    if (note.user.toString() !== req.user.id) return res.status(403).json({ message: "Access Denied" });

    if (req.body.isPrivate !== undefined) {
      if (req.body.isPrivate === false) {
        const userGroup = await Group.findOne({ members: req.user.id });
        if (!userGroup) return res.status(400).json({ message: "No group found." });
        note.groupId = userGroup._id;
        note.isPrivate = false;
      } else {
        note.groupId = null;
        note.isPrivate = true;
        note.deletedByUsers = [];
      }
    }

    if (req.body.title) note.title = req.body.title;
    if (req.body.courseId) note.courseId = req.body.courseId;
    if (req.body.content) note.content = req.body.content;
    if (req.body.referenceFiles) note.referenceFiles = req.body.referenceFiles;

    await note.save();
    await broadcastLiveUpdate(note.groupId, req.user.id);
    res.json(note);
  } catch (error) { res.status(500).json({ message: error.message }); }
});



app.put('/api/notes/:id/restore', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });

    if (note.user.toString() === req.user.id) {
      note.isDeleted = false;
      note.deletedAt = null;
    }
    note.deletedByUsers = note.deletedByUsers.filter(id => id.toString() !== req.user.id);
    await note.save();
    await broadcastLiveUpdate(note.groupId, req.user.id);
    res.json({ message: 'Restored cleanly' });
  } catch (error) { res.status(500).json({ error: "Error restoring note" }); }
});

app.delete('/api/notes/:id', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });

    const isCreator = note.user.toString() === req.user.id;
    const oldGroupId = note.groupId;

    if (isCreator) await Note.findByIdAndDelete(req.params.id);
    else { note.deletedByUsers.push(req.user.id); await note.save(); }

    await broadcastLiveUpdate(oldGroupId, req.user.id);
    res.json({ message: 'Permanently Purged' });
  } catch (error) { res.status(500).json({ error: "Error deleting note" }); }
});




app.get('/api/extension/leaderboard/:courseCode', async (req, res) => {
  try {
    const courseCode = req.params.courseCode;
    const section = req.query.section;
    const courseName = req.query.courseName;

    const email = req.query.email;
    if (email) {
      const requestingUser = await User.findOne({ email: { $regex: '^' + email.trim() + '$', $options: 'i' } });
      if (requestingUser) {
        const isSuperAdmin = requestingUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
        if (!requestingUser.isAdmin && !isSuperAdmin && requestingUser.isLeaderboardEnabled !== true) {
          return res.status(403).json({ error: "Leaderboard has been disabled for your account by an administrator." });
        }
      } else {
        return res.status(403).json({ error: "Leaderboard has been disabled for your account by an administrator." });
      }
    } else {
      return res.status(403).json({ error: "Leaderboard has been disabled for your account by an administrator." });
    }

    let query = {};
    if (courseName && section) {
      query = {
        name: { $regex: '^' + courseName.trim() + '$', $options: 'i' },
        section: { $regex: '^' + section.trim() + '$', $options: 'i' }
      };
    } else {
      if (courseCode.includes('-')) {
        
        query = { code: { $regex: '^' + courseCode.trim() + '$', $options: 'i' } };
      } else {
        
        query = { code: { $regex: '^' + courseCode.trim(), $options: 'i' } };
        if (section) {
          query.section = { $regex: '^' + section.trim() + '$', $options: 'i' };
        }
      }
    }

    
    const matchingCourses = await Course.find(query).populate('userId', 'name portalId customProfilePic');
    
    if (!matchingCourses || matchingCourses.length === 0) {
      return res.status(404).json({ message: "No students found in this section." });
    }

    const userIds = matchingCourses.map(c => c.userId?._id).filter(Boolean);
    const grades = await Grade.find({ userId: { $in: userIds } });

    let leaderboard = matchingCourses.map(course => {
      
      const userGrade = grades.find(g =>
        g.userId.toString() === course.userId?._id.toString() &&
        (
          (course.code && g.courseUrl && g.courseUrl.toLowerCase().includes(course.code.toLowerCase())) ||
          (course.code && g.courseName && g.courseName.toLowerCase().includes(course.code.toLowerCase())) ||
          g.courseName === course.name || 
          (course.name && g.courseName && g.courseName.toLowerCase().includes(course.name.toLowerCase()))
        )
      );

      let score = 0;
      if (userGrade && Array.isArray(userGrade.assessments)) {
        let totalMarkedWeight = 0;
        let totalEarnedWeight = 0;
        userGrade.assessments.forEach(cat => {
          const wNum = parseFloat(cat.weight) || 0;
          const pNum = parseFloat(cat.percentage) || 0;
          totalMarkedWeight += wNum;
          totalEarnedWeight += (pNum / 100) * wNum;
        });
        score = totalMarkedWeight > 0 ? (totalEarnedWeight / totalMarkedWeight) * 100 : 0;
      }

      return {
        id: course.userId?.portalId || 'Unknown ID',
        name: course.userId?.name || 'Unknown Student',
        score: score || 0,
        pic: course.userId?.customProfilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(course.userId?.name || 'Student')}&backgroundColor=4f46e5`
      };
    });

    leaderboard = leaderboard.filter(s => s.id !== 'Unknown ID');
    leaderboard.sort((a, b) => b.score - a.score);

    
    const total = leaderboard.length;
    leaderboard = leaderboard.map((s, idx) => {
      const pctile = (idx / total) * 100;
      let grade = 'F';
      if (pctile < 10) grade = 'A';
      else if (pctile < 20) grade = 'A-';
      else if (pctile < 35) grade = 'B+';
      else if (pctile < 50) grade = 'B';
      else if (pctile < 65) grade = 'B-';
      else if (pctile < 80) grade = 'C';
      else if (pctile < 95) grade = 'D';

      return { ...s, rank: idx + 1, grade };
    });

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Leaderboard generation error:', error);
    res.status(500).json({ error: "Failed to generate relative grading leaderboard" });
  }
});




app.get('/api/course-leaderboard/:courseId', auth, async (req, res) => {
  try {
    
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser) return res.status(404).json({ message: "User not found" });

    const isSuperAdmin = requestingUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    
    if (!requestingUser.isAdmin && !isSuperAdmin && requestingUser.isLeaderboardEnabled !== true) {
      return res.status(403).json({ message: "Leaderboard has been disabled for your account by an administrator." });
    }

    const gradeName = req.query.gradeName; 

    const myCourse = await Course.findById(req.params.courseId);
    if (!myCourse) return res.status(404).json({ message: "Course not found" });

    let query = {};
    if (myCourse.name && myCourse.section) {
      query = {
        name: { $regex: '^' + myCourse.name.trim() + '$', $options: 'i' },
        section: { $regex: '^' + myCourse.section.trim() + '$', $options: 'i' }
      };
    } else if (myCourse.code) {
      query.code = myCourse.code;
      if (myCourse.section) query.section = myCourse.section;
    } else {
      query.name = myCourse.name;
      if (myCourse.section) query.section = myCourse.section;
    }

    
    const matchingCourses = await Course.find(query).populate('userId', 'name portalId customProfilePic'); 
    
    if (!matchingCourses || matchingCourses.length === 0) {
      return res.status(404).json({ message: "No students found in this section." });
    }

    const userIds = matchingCourses.map(c => c.userId?._id).filter(Boolean);
    const grades = await Grade.find({ userId: { $in: userIds } });

    let leaderboard = matchingCourses.map(course => {
      const userGrade = grades.find(g => {
        if (!g.userId || !course.userId?._id) return false;
        if (g.userId.toString() !== course.userId._id.toString()) return false;
        
        
        if (gradeName) {
          return g.courseName === gradeName;
        }

        
        return (
          (course.code && g.courseUrl && g.courseUrl.toLowerCase().includes(course.code.toLowerCase())) ||
          (course.code && g.courseName && g.courseName.toLowerCase().includes(course.code.toLowerCase())) ||
          g.courseName === course.name || 
          (course.name && g.courseName && g.courseName.toLowerCase().includes(course.name.toLowerCase()))
        );
      });

      let score = 0;
      if (userGrade && Array.isArray(userGrade.assessments)) {
        let totalMarkedWeight = 0;
        let totalEarnedWeight = 0;
        userGrade.assessments.forEach(cat => {
          const wNum = parseFloat(cat.weight) || 0;
          const pNum = parseFloat(cat.percentage) || 0;
          totalMarkedWeight += wNum;
          totalEarnedWeight += (pNum / 100) * wNum;
        });
        score = totalMarkedWeight > 0 ? (totalEarnedWeight / totalMarkedWeight) * 100 : 0;
      }

      return {
        id: course.userId?.portalId || 'Unknown ID',
        name: course.userId?.name || 'Unknown Student',
        score: score || 0,
        pic: course.userId?.customProfilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(course.userId?.name || 'Student')}&backgroundColor=4f46e5`
      };
    });

    leaderboard = leaderboard.filter(s => s.id !== 'Unknown ID');
    leaderboard.sort((a, b) => b.score - a.score);

    const total = leaderboard.length;
    leaderboard = leaderboard.map((s, idx) => {
      const pctile = (idx / total) * 100;
      let grade = 'F';

      if (pctile < 10) grade = 'A';
      else if (pctile < 20) grade = 'A-';
      else if (pctile < 35) grade = 'B+';
      else if (pctile < 50) grade = 'B';
      else if (pctile < 65) grade = 'B-';
      else if (pctile < 80) grade = 'C';
      else if (pctile < 95) grade = 'D';

      return { ...s, rank: idx + 1, grade };
    });

    res.status(200).json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate relative grading leaderboard" });
  }
});




cron.schedule('0 20 * * *', async () => {
  try {
    const habits = await Habit.find({ isDeleted: false }).populate('userId');
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    
    for (const habit of habits) {
      if (!habit.userId || !habit.userId.expoPushToken) continue;
      
      if (habit.scheduleDays && !habit.scheduleDays.includes(todayDayOfWeek)) continue;
      
      if (habit.type === 'good') {
        const todayStr = new Date().setHours(0,0,0,0);
        const checksToday = habit.checkIns.filter(d => new Date(d).setHours(0,0,0,0) === todayStr).length;
        if (checksToday < habit.targetPerDay) {
          const title = "Habit Reminder 🎯";
          const message = `Don't forget to complete your habit: ${habit.name}!`;
          if (typeof sendPush === 'function') {
            await sendPush(habit.userId, title, message, { type: 'habit_reminder' }, 'smart-alert', 'default');
          }
          await createAcademicNotification(habit.userId._id, 'system', title, message);
        }
      }
    }
  } catch (error) { console.error("[CRON] Habit Reminder Error:", error); }
}, { timezone: "Asia/Karachi" });





cron.schedule('* * * * *', async () => {

  try {
    const allSubmissions = await Submission.find({
      tasks: { $exists: true, $not: { $size: 0 } },
      "tasks.status": { $ne: "Submitted" }
    }).populate({
      path: 'userId',
      match: { isPortalConnected: true }
    });
    const now = new Date();

    for (let sub of allSubmissions) {
      if (!sub.userId || !sub.tasks || sub.tasks.length === 0) continue;

      for (let task of sub.tasks) {
        if (task.status.toLowerCase().includes('submitted')) continue;

        const dueDate = new Date(task.dueDate);
        if (isNaN(dueDate)) continue;

        const diffMinutes = Math.floor((dueDate.getTime() - now.getTime()) / 60000);
        let alertMsg = null;

        if (diffMinutes === 24 * 60) alertMsg = "24 Hours Remaining!";
        else if (diffMinutes === 12 * 60) alertMsg = "12 Hours Remaining!";
        else if (diffMinutes === 6 * 60) alertMsg = "6 Hours Remaining!";
        else if (diffMinutes === 2 * 60) alertMsg = "2 Hours Remaining! Hurry!";
        else if (diffMinutes === 30) alertMsg = "FINAL WARNING: 30 Mins Left!";

        if (alertMsg) {
          sendPush(sub.userId, `Deadline Alert: ${sub.courseName} ⚠️`, `${alertMsg} for "${task.title}".`, { type: 'submission', url: task.submissionUrl });
          await createAcademicNotification(sub.userId, 'submission', `Deadline Alert: ${sub.courseName}`, `${alertMsg} for "${task.title}".`, task.submissionUrl);
        }
      }
    }
  } catch (error) { console.error(`[DEADLINE ENGINE] Error:`, error.message); }
});




cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] 🗑️ Initiating 30-Day Recycle Bin auto-purge...');
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const query = { isDeleted: true, deletedAt: { $lt: thirtyDaysAgo } };

    const deletedTasks = await Task.deleteMany(query);
    const deletedNotes = await Note.deleteMany(query);
    const deletedTransactions = await Transaction.deleteMany(query);
    const deletedHabits = await Habit.deleteMany(query);
    const deletedKeynotes = await Keynote.deleteMany(query);
    const deletedDebts = await Debt.deleteMany(query);

    console.log(`[CRON] 🗑️ Recycle Bin purge completed:
      - Tasks: ${deletedTasks.deletedCount}
      - Notes: ${deletedNotes.deletedCount}
      - Transactions: ${deletedTransactions.deletedCount}
      - Habits: ${deletedHabits.deletedCount}
      - Keynotes: ${deletedKeynotes.deletedCount}
      - Debts: ${deletedDebts.deletedCount}`);
  } catch (err) {
    console.error("[CRON] Recycle Bin purge error:", err.message);
  }
}, { timezone: "Asia/Karachi" });





async function sendSyncPromptToAll(title, body) {
  try {
    const activeUsers = await User.find({
      isPortalConnected: true,
      $or: [
        { pushTokens: { $exists: true, $not: { $size: 0 } } },
        { pushToken: { $exists: true, $ne: null } }
      ]
    });

    console.log(`[CRON] 📢 Sync Prompt (${title}) → ${activeUsers.length} users`);

    for (let user of activeUsers) {
      await sendPush(
        user,
        title,
        body,
        { type: 'sync_prompt', action: 'OPEN_APP' },
        'smart-alert',
        'default'
      );
    }
  } catch (error) {
    console.error(`[SYNC PROMPT] Error:`, error.message);
  }
}






const { scrapeServerSide } = require('./services/scraperEngine');


const runTieredSync = async (mode, logName) => {
  console.log(`[CRON] 🌐 Starting ${logName} Scrape Engine...`);
  try {
    const activeUsers = await User.find({
      isPortalConnected: true,
      ucpCookie: { $exists: true, $ne: null }
    });

    console.log(`[CRON] Found ${activeUsers.length} users for ${logName}.`);

    for (let user of activeUsers) {
      
      if (user.lastSyncAt && (Date.now() - new Date(user.lastSyncAt).getTime()) < 3 * 60 * 1000) {
        console.log(`[CRON] ⏭️ Skipping ${user.email} - synced ${Math.round((Date.now() - new Date(user.lastSyncAt).getTime()) / 1000)}s ago.`);
        continue;
      }

      const syncLog = new SyncLog({
        userId: user._id,
        portalId: user.portalId,
        mode: mode,
        status: 'PENDING',
        startTime: new Date()
      });
      await syncLog.save();
      const startTime = Date.now();

      try {
        const scrapedPayload = await scrapeServerSide(user.ucpCookie, mode, user.portalId);
        scrapedPayload.syncLogId = syncLog._id.toString();

        
        const token = jwt.sign({ id: user.id }, process.env.REACT_APP_JWT_SECRET || 'secret_key_123', { expiresIn: '1h' });
        const syncUrl = `http://127.0.0.1:${process.env.PORT || 5000}/api/extension-sync`;
        
        await axios.post(syncUrl, scrapedPayload, {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
          }
        });
        
        await SyncLog.findByIdAndUpdate(syncLog._id, { durationMs: Date.now() - startTime });
      } catch (err) {
        console.error(`[CRON] Failed ${logName} for ${user.email}:`, err.message);
        
        syncLog.status = 'FAILED';
        syncLog.error = err.message;
        syncLog.endTime = new Date();
        syncLog.durationMs = Date.now() - startTime;
        await syncLog.save();
        if (err.message === "Session Expired") {
          await User.findByIdAndUpdate(user._id, { isPortalConnected: false });
          const title = "UCP Session Expired ⚠️";
          const message = "Your background sync failed because your session expired. Tap here to log in again.";
          await sendPush(
            user,
            title,
            message,
            { type: "session_expired", action: "OPEN_APP" },
            "smart-alert",
            "default"
          );
          await createAcademicNotification(user._id, 'system', title, message);
        }
      }

      
      await new Promise(r => setTimeout(r, 2000));
    }
  } catch (error) {
    console.error(`[CRON] ${logName} Engine Error:`, error.message);
  }
};


cron.schedule('*/20 8-18 * * *', () => runTieredSync('HIGH', 'Submissions/Attendance/Grades (20m)'), { timezone: "Asia/Karachi" });


cron.schedule('0 */6 * * *', () => runTieredSync('FULL', 'Full Sync + Announcements (6h)'), { timezone: "Asia/Karachi" });

cron.schedule('0 2 * * *', () => runNightlyMaterialSync(User, Course), { timezone: "Asia/Karachi" });


app.post('/api/sync-grades', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.ucpCookie) return res.status(400).json({ message: 'Portal not connected.' });

    console.log(`[MANUAL_SYNC] User ${user.email} triggered manual FULL sync`);
    const syncLog = new SyncLog({
      userId: user._id,
      portalId: user.portalId,
      mode: 'FULL',
      status: 'PENDING',
      startTime: new Date()
    });
    await syncLog.save();
    const startTime = Date.now();

    try {
      const { scrapeServerSide } = require('./services/scraperEngine');
      const scrapedPayload = await scrapeServerSide(user.ucpCookie, 'FULL', user.portalId);
      scrapedPayload.syncLogId = syncLog._id.toString();

      const token = jwt.sign({ id: user.id }, process.env.REACT_APP_JWT_SECRET || 'secret_key_123', { expiresIn: '1h' });
      const syncUrl = `http://127.0.0.1:${process.env.PORT || 5000}/api/extension-sync`;
      
      await axios.post(syncUrl, scrapedPayload, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      });

      await SyncLog.findByIdAndUpdate(syncLog._id, { durationMs: Date.now() - startTime });
      res.json({ success: true, message: 'Sync complete.' });
    } catch (err) {
      console.error(`[MANUAL_SYNC] Sync failed:`, err.message);
      syncLog.status = 'FAILED';
      syncLog.error = err.message;
      syncLog.endTime = new Date();
      syncLog.durationMs = Date.now() - startTime;
      await syncLog.save();

      if (err.message === "Session Expired") {
        await User.findByIdAndUpdate(user._id, { isPortalConnected: false });
        res.status(401).json({ message: 'Session Expired' });
      } else {
        res.status(500).json({ message: err.message });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});






app.get('/api/course-material/download/:fileId', async (req, res) => {
  try {
    const token = req.header('x-auth-token') || req.query.token;
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    jwt.verify(token, process.env.REACT_APP_JWT_SECRET || 'secret_key_123');

    const file = await CourseMaterial.findById(req.params.fileId).lean();
    if (!file || !file.b2Key) {
      return res.status(404).json({ message: 'File not found.' });
    }
    const signedUrl = await getSignedDownloadUrl(file.b2Key, 300); 
    res.redirect(signedUrl);
  } catch (err) {
    console.error('[API] download redirect error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
});


app.get('/api/course-material/:courseCode/:sectionCode', auth, async (req, res) => {
  try {
    const { courseCode, sectionCode } = req.params;
    const globalCode = courseCode.split('-')[0].trim();
    const { getCurrentSemesterCode } = require('./services/scraperEngine');

    
    const course = await Course.findOne({ userId: req.user.id, code: courseCode }).lean();
    const activeSemester = course?.semester || getCurrentSemesterCode();

    const materials = await CourseMaterial.find({ courseCode: globalCode, sectionCode, semester: activeSemester })
      .select('fileName fileType fileSize parentArchive isArchiveExtracted b2Key')
      .sort({ isArchiveExtracted: 1, fileName: 1 })
      .lean();

    
    const token = req.header('x-auth-token');
    const baseUrl = getBaseUrl(req);
    const withUrls = materials.map((m) => ({
      ...m,
      downloadUrl: m.b2Key ? `${baseUrl}/api/course-material/download/${m._id}?token=${encodeURIComponent(token)}` : null
    }));

    
    const grouped = [];
    const archives = {};
    for (const m of withUrls) {
      if (m.isArchiveExtracted && m.parentArchive) {
        if (!archives[m.parentArchive]) archives[m.parentArchive] = [];
        archives[m.parentArchive].push(m);
      } else {
        if (m.fileType === 'zip' && archives[m.fileName]) {
          m.contents = archives[m.fileName];
        }
        grouped.push(m);
      }
    }
    
    for (const m of grouped) {
      if ((m.fileType === 'zip' || m.fileType === 'rar') && archives[m.fileName]) {
        m.contents = archives[m.fileName];
      }
    }

    res.json({ files: grouped, total: withUrls.length });
  } catch (err) {
    console.error('[API] course-material fetch error:', err.message);
    res.status(500).json({ message: 'Failed to fetch course materials.' });
  }
});


app.get('/api/course-material/status/:courseCode/:sectionCode', auth, async (req, res) => {
  try {
    const { courseCode, sectionCode } = req.params;
    const globalCode = courseCode.split('-')[0].trim();
    const { getCurrentSemesterCode } = require('./services/scraperEngine');

    const course = await Course.findOne({ userId: req.user.id, code: courseCode }).lean();
    const activeSemester = course?.semester || getCurrentSemesterCode();

    const count = await CourseMaterial.countDocuments({ courseCode: globalCode, sectionCode, semester: activeSemester });
    
    
    const pendingLinkSet = await MaterialLink.findOne({
      userId: req.user.id,
      courseCode: { $regex: '^' + globalCode + '(-|$)', $options: 'i' },
      processed: false,
      semester: activeSemester
    }).lean();

    const latest = await CourseMaterial.findOne({ courseCode: globalCode, sectionCode, semester: activeSemester })
      .sort({ createdAt: -1 }).lean();

    if (pendingLinkSet && pendingLinkSet.links && pendingLinkSet.links.length > 0) {
      const total = pendingLinkSet.links.length;
      const completed = pendingLinkSet.links.filter(l => l.processed).length;
      return res.json({
        fileCount: count,
        hasPending: true,
        lastSyncedAt: latest?.createdAt || null,
        isProcessing: true,
        totalFiles: total,
        processedFiles: completed
      });
    }

    res.json({
      fileCount: count,
      hasPending: false,
      lastSyncedAt: latest?.createdAt || null,
      isProcessing: false,
      totalFiles: 0,
      processedFiles: 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch status.' });
  }
});


app.post('/api/course-material/download-zip', auth, async (req, res) => {
  try {
    const { fileIds, courseName } = req.body;
    if (!fileIds || fileIds.length === 0) return res.status(400).json({ message: 'No files selected.' });
    if (fileIds.length > 20) return res.status(400).json({ message: 'Max 20 files per download.' });

    const AdmZip = require('adm-zip');
    const zip = new AdmZip();

    const materials = await CourseMaterial.find({ _id: { $in: fileIds } }).lean();

    for (const m of materials) {
      if (!m.b2Key) continue;
      try {
        
        const signedUrl = await getSignedDownloadUrl(m.b2Key, 300);
        const response = await fetch(signedUrl);
        if (!response.ok) continue;
        const buf = Buffer.from(await response.arrayBuffer());
        zip.addFile(m.fileName || m.normalizedFileName, buf);
      } catch (_) {}
    }

    const zipBuffer = zip.toBuffer();
    const safeCourseName = (courseName || 'course-materials').replace(/[^a-zA-Z0-9-_]/g, '_');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeCourseName}_files.zip"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err) {
    console.error('[API] download-zip error:', err.message);
    res.status(500).json({ message: 'Failed to create zip.' });
  }
});






app.get('/api/admin/vault/files/pending', adminAuth, async (req, res) => {
  try {
    const files = await CourseVaultFile.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.get('/api/admin/vault/buckets/:courseCode', adminAuth, async (req, res) => {
  try {
    const courseCode = req.params.courseCode.split('-')[0].trim();
    const buckets = await CourseVaultBucket.find({ courseCode }).sort({ createdAt: 1 }).lean();
    res.json(buckets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.post('/api/admin/vault/buckets', adminAuth, async (req, res) => {
  try {
    const { name, courseCode } = req.body;
    const globalCode = courseCode.split('-')[0].trim();
    const bucket = await CourseVaultBucket.create({ name, courseCode: globalCode, createdBy: req.user.id });
    res.json(bucket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.delete('/api/admin/vault/buckets/:id', adminAuth, async (req, res) => {
  try {
    await CourseVaultBucket.findByIdAndDelete(req.params.id);
    
    await CourseVaultFile.updateMany({ bucketId: req.params.id }, { $set: { status: 'pending', bucketId: null } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.put('/api/admin/vault/files/:id/publish', adminAuth, async (req, res) => {
  try {
    const { bucketId } = req.body;
    const updated = await CourseVaultFile.findByIdAndUpdate(req.params.id, {
      status: 'published',
      bucketId
    }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.delete('/api/admin/vault/files/:id', adminAuth, async (req, res) => {
  try {
    const file = await CourseVaultFile.findById(req.params.id);
    if (!file) return res.status(404).json({ message: 'Not found' });
    if (file.b2Key) {
        
    }
    await CourseVaultFile.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});






app.get('/api/admin/course-materials/courses', auth, adminAuth, async (req, res) => {
  try {
    const courses = await CourseMaterial.aggregate([
      {
        $match: {
          isArchiveExtracted: false
        }
      },
      {
        $group: {
          _id: { courseCode: "$courseCode", sectionCode: "$sectionCode", semester: "$semester" },
          courseName: { $first: "$courseName" },
          fileCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.courseCode",
          courseName: { $first: "$courseName" },
          sections: {
            $push: {
              sectionCode: "$_id.sectionCode",
              semester: "$_id.semester",
              fileCount: "$fileCount"
            }
          }
        }
      },
      {
        $project: {
          courseCode: "$_id",
          courseName: { $ifNull: ["$courseName", "$_id"] },
          sections: 1,
          _id: 0
        }
      },
      { $sort: { courseName: 1 } }
    ]);
    res.json(courses);
  } catch (err) {
    console.error('[API] admin get course list error:', err.message);
    res.status(500).json({ message: 'Failed to fetch admin course materials.' });
  }
});


app.get('/api/admin/course-materials/files', auth, adminAuth, async (req, res) => {
  try {
    const { courseCode, sectionCode, semester } = req.query;
    if (!courseCode || !sectionCode || !semester) {
      return res.status(400).json({ message: 'Missing courseCode, sectionCode, or semester.' });
    }

    
    const materials = await CourseMaterial.find({ courseCode, sectionCode, semester })
      .select('fileName fileType fileSize parentArchive isArchiveExtracted b2Key createdAt')
      .sort({ isArchiveExtracted: 1, fileName: 1 })
      .lean();

    
    const token = req.header('x-auth-token');
    const baseUrl = getBaseUrl(req);
    const withUrls = materials.map((m) => ({
      ...m,
      downloadUrl: m.b2Key ? `${baseUrl}/api/course-material/download/${m._id}?token=${encodeURIComponent(token)}` : null
    }));

    
    const grouped = [];
    const archives = {};
    for (const m of withUrls) {
      if (m.isArchiveExtracted && m.parentArchive) {
        if (!archives[m.parentArchive]) archives[m.parentArchive] = [];
        archives[m.parentArchive].push(m);
      } else {
        grouped.push(m);
      }
    }
    for (const m of grouped) {
      if ((m.fileType === 'zip' || m.fileType === 'rar') && archives[m.fileName]) {
        m.contents = archives[m.fileName];
      }
    }

    
    const enrollments = await Course.find({
      code: { $regex: '^' + courseCode + '(-|$)' },
      section: sectionCode,
      semester: semester
    }).populate('userId', 'name email rollNumber isPortalConnected').lean();

    const totalStudents = enrollments.length;
    const connectedStudents = enrollments
      .filter(e => e.userId && e.userId.isPortalConnected)
      .map(e => ({
        _id: e.userId._id,
        name: e.userId.name,
        email: e.userId.email,
        rollNumber: e.userId.rollNumber || ''
      }));

    res.json({
      files: grouped,
      totalFiles: withUrls.length,
      studentStats: {
        total: totalStudents,
        connectedCount: connectedStudents.length,
        connectedList: connectedStudents
      }
    });
  } catch (err) {
    console.error('[API] admin get section files error:', err.message);
    res.status(500).json({ message: 'Failed to fetch course files and stats.' });
  }
});



app.get('/api/course-vault/:courseCode', auth, async (req, res) => {
  try {
    const rawCourseCode = decodeURIComponent(req.params.courseCode).trim();
    const courseCode = rawCourseCode.split('-')[0].trim();
    
    const files = await CourseVaultFile.find({ courseCode, status: 'published' }).sort({ createdAt: -1 }).lean();
    const buckets = await CourseVaultBucket.find({ courseCode }).sort({ createdAt: 1 }).lean();

    
    const withUrls = await Promise.all(files.map(async (f) => {
      const viewUrl = f.b2Key ? await getSignedDownloadUrl(f.b2Key, 7200) : null;
      return { ...f, viewUrl };
    }));

    
    const grouped = {};
    for (const b of buckets) {
      grouped[b._id.toString()] = { bucket: b, files: [] };
    }
    grouped['unbucketed'] = { bucket: { _id: 'unbucketed', name: 'Other Files' }, files: [] };

    for (const f of withUrls) {
      if (f.bucketId && grouped[f.bucketId.toString()]) {
        grouped[f.bucketId.toString()].files.push(f);
      } else {
        grouped['unbucketed'].files.push(f);
      }
    }

    const response = Object.values(grouped).filter(g => g.files.length > 0 || g.bucket._id !== 'unbucketed').map(g => ({
      bucketId: g.bucket._id,
      bucketName: g.bucket.name,
      fileCount: g.files.length,
      files: g.files
    }));

    res.json(response);
  } catch (err) {
    console.error('[API] course-vault error:', err.message);
    res.status(500).json({ message: 'Failed to fetch vault.' });
  }
});


app.get('/api/course-vault/view/:id', auth, async (req, res) => {
  try {
    const vaultFile = await CourseVaultFile.findById(req.params.id).lean();
    if (!vaultFile || !vaultFile.b2Key) return res.status(404).json({ message: 'Not found.' });
    const viewUrl = await getSignedDownloadUrl(vaultFile.b2Key, 7200);
    res.json({ viewUrl, fileName: vaultFile.fileName, fileType: vaultFile.fileType });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate view URL.' });
  }
});


app.post('/api/course-material/upload', auth, async (req, res) => {
  return res.status(403).json({ message: 'Manual uploads are disabled. Course materials are synced automatically from Horizon Portal.' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT} with WebSockets enabled!`));

