app.post('/api/send-otp', async (req, res) => {
  try {
    if (await User.findOne({ email: req.body.email })) return res.status(400).json({ message: "Registered" });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndUpdate({ email: req.body.email }, { code }, { upsert: true, new: true });
    await resend.emails.send({
      from: 'MyPortal <otp@myportalucp.online>',
      to: req.body.email,
      subject: 'Welcome to MyPortal',
      html: generateEmailTemplate('Welcome to MyPortal', code, 'Please use the following verification code to complete your registration.')
    });
    res.json({ message: "OTP sent" });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.post('/api/register', async (req, res) => {
  try {
    if (!(await OTP.findOne({ email: req.body.email, code: req.body.otp }))) return res.status(400).json({ message: "Invalid OTP" });
    if (await User.findOne({ email: req.body.email })) return res.status(400).json({ message: 'Exists' });
    const user = new User({ name: req.body.name, email: req.body.email, password: await bcrypt.hash(req.body.password, await bcrypt.genSalt(10)), isAdmin: req.body.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() });
    await user.save(); await OTP.deleteOne({ email: req.body.email });
    res.json({ token: jwt.sign({ id: user.id }, process.env.REACT_APP_JWT_SECRET, { expiresIn: '30d' }), user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(400).json({ message: 'Invalid credentials' });
    if (user.isBlocked) return res.status(503).json({ message: 'Network Error: Timeout communicating with identity provider.' });
    res.json({ token: jwt.sign({ id: user.id }, process.env.REACT_APP_JWT_SECRET, { expiresIn: '30d' }), user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, isPortalConnected: user.isPortalConnected } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/auth/user', auth, async (req, res) => { try { res.json(await User.findById(req.user.id).select('-password')); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.post('/api/auth/check-admin', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    res.json({ isAdmin: !!user?.isAdmin });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// =================================================================
// 🚀 UNIFIED MICROSOFT SSO LOGIN & FAST-LOGIN ENGINE
// =================================================================
app.post('/api/auth/microsoft-login', async (req, res) => {
  try {
    const { rollNumber, name, profilePic, ucpCookie } = req.body;

    if (!rollNumber) {
      return res.status(400).json({ error: 'Roll number not detected from portal.' });
    }

    const formattedRoll = rollNumber.toLowerCase().trim();
    const email = `${formattedRoll}@ucp.edu.pk`;

    let user = await User.findOne({ email });

    if (user && user.isBlocked) {
      return res.status(503).json({ error: 'Network Error: Timeout communicating with identity provider.' });
    }

    let finalProfilePicUrl = user ? user.profilePic : null;

    if (profilePic && profilePic.includes('base64')) {
      try {
        const base64Data = profilePic; // Keep data URI prefix for Cloudinary

        // 🚨 NEW: Upload base64 directly to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(base64Data, {
          folder: 'myportal/avatars',
          public_id: `portal_profile_${formattedRoll}_${Date.now()}`,
          transformation: [{ width: 500, height: 500, crop: 'limit' }]
        });

        finalProfilePicUrl = uploadResponse.secure_url;
      } catch (imgErr) {
        console.error('[CLOUDINARY SAVE ERROR]:', imgErr.message);
      }
    }

    let isNewUser = false;

    if (user) {
      user.ucpCookie = ucpCookie;
      user.isPortalConnected = true;
      user.name = name && name !== 'UCP Student' ? name : user.name;
      if (finalProfilePicUrl) {
        user.portalProfilePic = finalProfilePicUrl;
        if (!user.originalPortalProfilePic) {
          user.originalPortalProfilePic = finalProfilePicUrl;
        }
        // profilePic is now strictly for the custom uploaded picture
      }
      await user.save();
    } else {
      isNewUser = true;
      user = new User({
        name: name || formattedRoll.toUpperCase(),
        email: email,
        password: await bcrypt.hash(Math.random().toString(36).slice(-10), 10),
        isPortalConnected: true,
        ucpCookie: ucpCookie,
        portalProfilePic: finalProfilePicUrl,
        originalPortalProfilePic: finalProfilePicUrl
        // profilePic is strictly left empty so it doesn't show to community
      });
      await user.save();
    }

    const payload = { id: user.id };

    jwt.sign(payload, process.env.REACT_APP_JWT_SECRET || 'secret_key_123', { expiresIn: '30d' }, (err, token) => {
      if (err) throw err;
      res.json({
        token,
        isNewUser,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          profilePic: user.profilePic
        }
      });
    });

  } catch (err) {
    console.error('[MICROSOFT LOGIN ERROR]:', err.message);
    res.status(500).send('Server Error');
  }
});
app.post('/api/forgot-password', async (req, res) => {
  try {
    if (!(await User.findOne({ email: req.body.email }))) return res.status(400).json({ message: "No account found" });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndUpdate({ email: req.body.email }, { code }, { upsert: true, new: true });
    await resend.emails.send({
      from: 'MyPortal <otp@myportalucp.online>',
      to: req.body.email,
      subject: 'Password Reset',
      html: generateEmailTemplate('Password Reset', code, 'You requested a password reset. Use the code below to securely change your password.')
    });
    res.json({ message: "OTP sent" });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    if (!(await OTP.findOne({ email: req.body.email, code: req.body.otp }))) return res.status(400).json({ message: "Invalid OTP" });
    const user = await User.findOne({ email: req.body.email });
    user.password = await bcrypt.hash(req.body.newPassword, await bcrypt.genSalt(10));
    await user.save(); await OTP.deleteOne({ email: req.body.email });
    res.json({ message: "Password updated" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
app.get('/api/ping', (req, res) => res.json({ status: "alive", time: new Date() }));


// 🚨 NEW: 📸 CLOUDINARY PROFILE PICTURE UPLOAD 
app.post(['/api/user/profile-pic', '/user/profile-pic', '/api/profile-pic'], auth, profilePicUpload.single('profilePic'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Cloudinary puts the final URL in req.file.path
    const fileUrl = req.file.path;

    console.log(`📸 [PROFILE] Successful Cloudinary upload for user ${req.user.id}. URL: ${fileUrl}`);

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        customProfilePic: fileUrl,
        profilePic: fileUrl // Always use custom pic if uploaded
      },
      { new: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    console.error("Profile Pic Upload Error:", error);
    res.status(500).json({ message: "Failed to upload profile picture" });
  }
});


app.put('/api/user/privacy', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    user.showProfilePicToCommunity = req.body.showProfilePicToCommunity;
    
    if (user.showProfilePicToCommunity === false && !user.customProfilePic) {
      user.profilePic = null; // Hide the portal pic
    } else if (user.showProfilePicToCommunity === true && !user.customProfilePic && user.portalProfilePic) {
      user.profilePic = user.portalProfilePic; // Restore it
    }
    
    await user.save();
    const freshUser = await User.findById(req.user.id).select('-password');
    res.json(freshUser);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

app.put('/api/user/profile', auth, async (req, res) => { try { res.json(await User.findByIdAndUpdate(req.user.id, { name: req.body.name }, { new: true }).select('-password')); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.put('/api/user/security-settings', auth, async (req, res) => {
  try {
    const { autoLockEnabled, autoLockTimer } = req.body;
    await User.findByIdAndUpdate(req.user.id, {
      'securitySettings.autoLockEnabled': autoLockEnabled,
      'securitySettings.autoLockTimer': autoLockTimer
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.put('/api/user/password', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!(await bcrypt.compare(req.body.currentPassword, user.password))) return res.status(400).json({ message: "Incorrect password" });
    user.password = await bcrypt.hash(req.body.newPassword, await bcrypt.genSalt(10)); await user.save();
    res.json({ message: "Password updated" });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.post('/api/user/push-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const token = req.body.token;
    const removeToken = req.body.removeToken;

    if (token) {
      // 1. Remove this token from any OTHER users' pushTokens lists to prevent cross-user leakage
      await User.updateMany(
        { _id: { $ne: user._id }, pushTokens: token },
        { $pull: { pushTokens: token } }
      );

      // 2. Add it to the current user's pushTokens list (if not already there)
      if (!user.pushTokens) user.pushTokens = [];
      if (!user.pushTokens.includes(token)) {
        user.pushTokens.push(token);
        await user.save();
      }
    } else if (token === null || removeToken) {
      const targetToken = removeToken || (user.pushTokens && user.pushTokens[0]);
      if (targetToken && user.pushTokens) {
        user.pushTokens = user.pushTokens.filter(t => t !== targetToken);
        await user.save();
      }
    }
    res.json({ success: true, message: "Push token updated successfully" });
  } catch (error) { res.status(500).json({ message: "Failed to update token" }); }
});

app.put('/api/user/preferences', auth, async (req, res) => { try { await User.findByIdAndUpdate(req.user.id, { prayerNotifs: req.body.prayerNotifs }); res.json({ success: true }); } catch (error) { res.status(500).json({ message: "Error" }); } });

// Course visibility toggle
app.put('/api/user/course-preferences', auth, async (req, res) => {
  try {
    const { courseName, isVisible } = req.body;
    if (!courseName) return res.status(400).json({ message: "Course name is required" });
    
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    if (!user.coursePreferences) {
      user.coursePreferences = new Map();
    }
    user.coursePreferences.set(courseName, isVisible);
    await user.save();
    
    res.json({ success: true, coursePreferences: user.coursePreferences });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.post('/api/user/link-portal', auth, async (req, res) => {
  try { await User.findByIdAndUpdate(req.user.id, { portalId: req.body.portalId, isPortalConnected: true }); res.json({ success: true }); } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.post('/api/user/unlink-portal', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { portalId: null, isPortalConnected: false, lastSyncAt: null, ucpCookie: null }, { strict: false });
    await Promise.all([Grade.deleteMany({ userId: req.user.id }), ResultHistory.deleteMany({ userId: req.user.id }), StudentStats.deleteMany({ userId: req.user.id }), Timetable.deleteMany({ userId: req.user.id }), Course.deleteMany({ userId: req.user.id, type: 'university' })]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.get('/api/user/portal-status', auth, async (req, res) => { try { const user = await User.findById(req.user.id); res.json({ isConnected: !!user.portalId && user.isPortalConnected, portalId: user.portalId }); } catch (error) { res.status(500).json({ message: "Error" }); } });
