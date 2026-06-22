  }
};




app.post('/api/feedback', auth, async (req, res) => {
  try {
    const { subject, description, screenshots } = req.body;
    if (!subject || !description) return res.status(400).json({ message: "Subject and description are required." });

    const newFeedback = new Feedback({
      userId: req.user.id,
      subject: subject,
      description: description,
      screenshots: screenshots || []
    });

    await newFeedback.save();
    res.json({ success: true, message: "Feedback submitted successfully." });
  } catch (error) {
    console.error("Feedback Error:", error);
    res.status(500).json({ message: "Server Error processing feedback" });
  }
});


app.get('/api/feedback/my', auth, async (req, res) => {
  try {
    const tickets = await Feedback.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error("Fetch User Tickets Error:", error);
    res.status(500).json({ message: "Server Error fetching tickets" });
  }
});


app.get('/api/admin/feedback', auth, adminAuth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find().populate('userId', 'name email customProfilePic portalProfilePic originalPortalProfilePic profilePic').sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) { res.status(500).json({ message: "Server Error" }); }
});


app.put('/api/admin/feedback/:id/resolve', auth, adminAuth, async (req, res) => {
  try {
    const { adminResponse } = req.body;
    if (!adminResponse) return res.status(400).json({ message: "Admin response is required." });

    const ticket = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', adminResponse, disputeMessage: null },
      { new: true }
    ).populate('userId', 'name email customProfilePic portalProfilePic originalPortalProfilePic profilePic pushTokens pushToken');

    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    
    if (ticket.userId) {
      try {
        await sendPush(
          ticket.userId,
          "Support Ticket Resolved ✅",
          `Your ticket "${ticket.subject}" has been resolved by support. Tap to view the details.`,
          { type: "ticket_resolved", ticketId: ticket._id.toString() }
        );
      } catch (pushErr) {
        console.error("Failed to send ticket resolve push notification:", pushErr.message);
      }
    }

    res.json(ticket);
  } catch (error) {
    console.error("Resolve Ticket Error:", error);
    res.status(500).json({ message: "Server Error resolving ticket" });
  }
});


app.put('/api/feedback/:id/dispute', auth, async (req, res) => {
  try {
    const { disputeMessage } = req.body;
    if (!disputeMessage) return res.status(400).json({ message: "Dispute reason is required." });

    const ticket = await Feedback.findOne({ _id: req.params.id, userId: req.user.id });
    if (!ticket) return res.status(404).json({ message: "Ticket not found." });
    if (ticket.status !== 'resolved') return res.status(400).json({ message: "Only resolved tickets can be disputed." });

    ticket.status = 'disputed';
    ticket.disputeMessage = disputeMessage;
    await ticket.save();

    res.json(ticket);
  } catch (error) {
    console.error("Dispute Ticket Error:", error);
    res.status(500).json({ message: "Server Error disputing ticket" });
  }
});


app.put('/api/admin/feedback/:id/deny-dispute', auth, adminAuth, async (req, res) => {
  try {
    const ticket = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: 'invalid' },
      { new: true }
    ).populate('userId', 'name email customProfilePic portalProfilePic originalPortalProfilePic profilePic pushTokens pushToken');

    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    
    if (ticket.userId) {
      try {
        await sendPush(
          ticket.userId,
          "Support Dispute Denied ❌",
          `Your dispute on ticket "${ticket.subject}" has been marked as invalid.`,
          { type: "dispute_denied", ticketId: ticket._id.toString() }
        );
      } catch (pushErr) {
        console.error("Failed to send dispute denied push notification:", pushErr.message);
      }
    }

    res.json(ticket);
  } catch (error) {
    console.error("Deny Dispute Error:", error);
    res.status(500).json({ message: "Server Error denying dispute" });
  }
});


app.post('/api/admin/feedback/bulk-delete', auth, adminAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No ticket IDs provided." });
    }

    await Feedback.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: "Selected tickets deleted successfully." });
  } catch (error) {
    console.error("Bulk Delete Tickets Error:", error);
    res.status(500).json({ message: "Server Error deleting tickets" });
  }
});


app.put('/api/admin/feedback/:id/reopen', auth, adminAuth, async (req, res) => {
  try {
    const ticket = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: 'open', adminResponse: null },
      { new: true }
    ).populate('userId', 'name email customProfilePic portalProfilePic originalPortalProfilePic profilePic pushTokens pushToken');

    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    
    if (ticket.userId) {
      try {
        await sendPush(
          ticket.userId,
          "Support Ticket Re-opened 🔄",
          `Your ticket "${ticket.subject}" has been re-opened for further review.`,
          { type: "ticket_reopened", ticketId: ticket._id.toString() }
        );
      } catch (pushErr) {
        console.error("Failed to send ticket re-open push notification:", pushErr.message);
      }
    }

    res.json(ticket);
  } catch (error) {
    console.error("Re-open Ticket Error:", error);
    res.status(500).json({ message: "Server Error re-opening ticket" });
  }
});





const apkDiskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'myportal.apk');
  }
});

const apkUpload = multer({
  storage: apkDiskStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.apk') {
      return cb(new Error('Only APK files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 250 * 1024 * 1024 } 
});


app.get('/api/public/settings', async (req, res) => {
  try {
    let webPortalLink = "https://myportalucp.online/";
    const linkSetting = await SystemSettings.findOne({ key: "web_portal_link" });
    if (linkSetting) {
      webPortalLink = linkSetting.value;
    }

    let apkInfo = { uploaded: false };
    const dbSetting = await SystemSettings.findOne({ key: "apk_info" });
    const baseUrl = getBaseUrl(req);

    if (dbSetting && dbSetting.value && dbSetting.value.uploaded) {
      apkInfo = {
        ...dbSetting.value,
        url: `${baseUrl}/api/public/download-apk`
      };
    } else {
      const apkPath = path.join(uploadDir, 'myportal.apk');
      if (fs.existsSync(apkPath)) {
        const stat = fs.statSync(apkPath);
        apkInfo = {
          uploaded: true,
          filename: 'myportal.apk',
          size: stat.size,
          uploadedAt: stat.mtime,
          url: `${baseUrl}/api/public/download-apk`
        };
      }
    }

    res.json({ webPortalLink, apkInfo });
  } catch (error) {
    console.error("Public Settings Error:", error);
    res.status(500).json({ message: "Server Error fetching settings" });
  }
});


app.get('/api/public/download-apk', async (req, res) => {
  try {
    const dbSetting = await SystemSettings.findOne({ key: "apk_info" });
    
    
    if (dbSetting && dbSetting.value && dbSetting.value.uploaded && dbSetting.value.url && !dbSetting.value.url.includes('/api/public/download-apk')) {
      const cloudinaryUrl = dbSetting.value.url;
      
      const streamRes = await axios({
        method: 'get',
        url: cloudinaryUrl,
        responseType: 'stream'
      });
      
      
      res.setHeader('Content-Disposition', 'attachment; filename="myportal.apk"');
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      
      
      
      if (streamRes.headers['content-length']) {
        res.setHeader('Content-Length', streamRes.headers['content-length']);
      }
      
      return streamRes.data.pipe(res);
    }
    
    
    const apkPath = path.join(uploadDir, 'myportal.apk');
    if (!fs.existsSync(apkPath)) {
      return res.status(404).json({ message: "APK release not found on server storage." });
    }
    res.download(apkPath, 'myportal.apk');
  } catch (error) {
    console.error("Download APK Error:", error);
    res.status(500).json({ message: "Server error processing file download." });
  }
});


app.post('/api/feedback/public', async (req, res) => {
  try {
    const { name, email, subject, description } = req.body;
    if (!name || !email || !subject || !description) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const newFeedback = new Feedback({
      name,
      email,
      subject,
      description,
      status: 'open'
    });
    await newFeedback.save();
    res.json({ success: true, message: "Feedback submitted successfully." });
  } catch (error) {
    console.error("Public Feedback Error:", error);
    res.status(500).json({ message: "Server Error processing feedback" });
  }
});


app.post('/api/admin/settings/web-portal-link', auth, adminAuth, async (req, res) => {
  try {
    const { link } = req.body;
    if (!link) return res.status(400).json({ message: "Link is required." });

    const setting = await SystemSettings.findOneAndUpdate(
      { key: "web_portal_link" },
      { value: link },
      { upsert: true, new: true }
    );
    res.json({ success: true, link: setting.value });
  } catch (error) {
    console.error("Save Web Portal Link Error:", error);
    res.status(500).json({ message: "Server Error saving portal link" });
  }
});


app.post('/api/admin/settings/apk-upload', auth, adminAuth, (req, res) => {
  apkUpload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    try {
      const baseUrl = getBaseUrl(req);
      const apkInfo = {
        uploaded: true,
        filename: 'myportal.apk',
        size: req.file.size,
        uploadedAt: new Date(),
        url: `${baseUrl}/api/public/download-apk`
      };

      await SystemSettings.findOneAndUpdate(
        { key: "apk_info" },
        { value: apkInfo },
        { upsert: true, new: true }
      );

      res.json({ success: true, apkInfo });
    } catch (error) {
      console.error("APK Settings Save Error:", error);
      res.status(500).json({ message: "Server Error saving APK metadata" });
    }
  });
});


app.delete('/api/admin/settings/apk-delete', auth, adminAuth, async (req, res) => {
  try {
    const apkPath = path.join(uploadDir, 'myportal.apk');
    if (fs.existsSync(apkPath)) {
      fs.unlinkSync(apkPath);
    }

    const apkInfo = {
      uploaded: false,
      filename: null,
      size: 0,
      uploadedAt: null,
      url: null
    };

    await SystemSettings.findOneAndUpdate(
      { key: "apk_info" },
      { value: apkInfo },
      { upsert: true, new: true }
    );

    res.json({ success: true, apkInfo });
  } catch (error) {
    console.error("Delete APK Error:", error);
    res.status(500).json({ message: "Server Error deleting APK" });
  }
});




app.post(
  '/api/admin/apk-chunk',
  auth,
  adminAuth,
  express.raw({ type: 'application/octet-stream', limit: '12mb' }),
  (req, res) => {
    try {
      const chunkIndex = parseInt(req.headers['x-chunk-index'], 10);
      const totalChunks = parseInt(req.headers['x-total-chunks'], 10);

      if (isNaN(chunkIndex) || isNaN(totalChunks)) {
        return res.status(400).json({ message: 'Missing x-chunk-index or x-total-chunks headers.' });
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ message: 'Empty chunk body received.' });
      }

      const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`);
      fs.writeFileSync(chunkPath, req.body);

      console.log(`📦 APK chunk ${chunkIndex + 1}/${totalChunks} saved (${(req.body.length / 1024 / 1024).toFixed(2)} MB)`);
      res.json({ success: true, received: chunkIndex });
    } catch (err) {
      console.error('APK Chunk Upload Error:', err);
      res.status(500).json({ message: 'Server error saving chunk.' });
    }
  }
);


app.post('/api/admin/apk-finalize', auth, adminAuth, async (req, res) => {
  try {
    const { totalChunks, totalSize } = req.body;
    if (!totalChunks || totalChunks < 1) {
      return res.status(400).json({ message: 'totalChunks is required.' });
    }

    const finalApkPath = path.join(uploadDir, 'myportal.apk');

    
    if (fs.existsSync(finalApkPath)) {
      fs.unlinkSync(finalApkPath);
      console.log('🗑️  Deleted old myportal.apk before assembly.');
    }

    
    for (let i = 0; i < totalChunks; i++) {
      const cp = path.join(chunkDir, `chunk_${i}`);
      if (!fs.existsSync(cp)) {
        return res.status(400).json({ message: `Missing chunk ${i}. Upload may be incomplete.` });
      }
    }

    
    const writeStream = fs.createWriteStream(finalApkPath);
    for (let i = 0; i < totalChunks; i++) {
      const cp = path.join(chunkDir, `chunk_${i}`);
      const chunkData = fs.readFileSync(cp);
      writeStream.write(chunkData);
    }
    writeStream.end();

    
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    
    for (let i = 0; i < totalChunks; i++) {
      try { fs.unlinkSync(path.join(chunkDir, `chunk_${i}`)); } catch {}
    }

    const assembledSize = fs.statSync(finalApkPath).size;
    console.log(`✅ APK assembled successfully: ${(assembledSize / 1024 / 1024).toFixed(2)} MB`);

    
    const baseUrl = getBaseUrl(req);
    const apkInfo = {
      uploaded: true,
      filename: 'myportal.apk',
      size: assembledSize,
      uploadedAt: new Date(),
      url: `${baseUrl}/api/public/download-apk`
    };

    await SystemSettings.findOneAndUpdate(
      { key: 'apk_info' },
      { value: apkInfo },
      { upsert: true, new: true }
    );

    res.json({ success: true, apkInfo });
  } catch (err) {
    console.error('APK Finalize Error:', err);
    res.status(500).json({ message: 'Server error assembling APK.' });
  }
});


app.post('/api/admin/settings/apk-url', auth, adminAuth, async (req, res) => {
  try {
    const { url, size, filename } = req.body;
    if (!url) return res.status(400).json({ message: "URL is required." });

    const apkInfo = {
      uploaded: true,
      filename: filename || 'myportal.apk',
      size: size || 0,
      uploadedAt: new Date(),
      url: url
    };

    const setting = await SystemSettings.findOneAndUpdate(
      { key: "apk_info" },
      { value: apkInfo },
      { upsert: true, new: true }
    );

    res.json({ success: true, apkInfo: setting.value });
  } catch (error) {
    console.error("Save APK URL Error:", error);
    res.status(500).json({ message: "Server Error saving APK URL" });
  }
});
