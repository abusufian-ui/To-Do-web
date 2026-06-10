  }
};

// ==========================================
// 🚀 ROUTES: FEEDBACK & SUPPORT
// ==========================================
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

// Fetch current user's submitted support tickets
app.get('/api/feedback/my', auth, async (req, res) => {
  try {
    const tickets = await Feedback.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error("Fetch User Tickets Error:", error);
    res.status(500).json({ message: "Server Error fetching tickets" });
  }
});

// Fetch all tickets for admin panel
app.get('/api/admin/feedback', auth, adminAuth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find().populate('userId', 'name email customProfilePic portalProfilePic originalPortalProfilePic profilePic').sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) { res.status(500).json({ message: "Server Error" }); }
});

// Resolve and close a support ticket
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

    // Send push notification to the user
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

// User disputes a resolved support ticket
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

// Admin deny dispute and mark ticket as invalid
app.put('/api/admin/feedback/:id/deny-dispute', auth, adminAuth, async (req, res) => {
  try {
    const ticket = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: 'invalid' },
      { new: true }
    ).populate('userId', 'name email customProfilePic portalProfilePic originalPortalProfilePic profilePic pushTokens pushToken');

    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    // Send push notification to the user
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

// Bulk delete support tickets
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

// Re-open a resolved support ticket
app.put('/api/admin/feedback/:id/reopen', auth, adminAuth, async (req, res) => {
  try {
    const ticket = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: 'open', adminResponse: null },
      { new: true }
    ).populate('userId', 'name email customProfilePic portalProfilePic originalPortalProfilePic profilePic pushTokens pushToken');

    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    // Send push notification to the user
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

// ==========================================
// 🚀 NEW: PUBLIC AND ADMIN WEBSITE SETTINGS & APK ENDPOINTS
// ==========================================

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
  limits: { fileSize: 250 * 1024 * 1024 } // 250MB limit
});

// Public: Get general website configuration
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

// Public: Stream and download the active APK file with forced filename
app.get('/api/public/download-apk', async (req, res) => {
  try {
    const dbSetting = await SystemSettings.findOne({ key: "apk_info" });
    
    // Check if Cloudinary URL is stored and valid
    if (dbSetting && dbSetting.value && dbSetting.value.uploaded && dbSetting.value.url && !dbSetting.value.url.includes('/api/public/download-apk')) {
      const cloudinaryUrl = dbSetting.value.url;
      
      const streamRes = await axios({
        method: 'get',
        url: cloudinaryUrl,
        responseType: 'stream'
      });
      
      // Set forced download headers so browser always saves as myportal.apk
      res.setHeader('Content-Disposition', 'attachment; filename="myportal.apk"');
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      
      // Forward Content-Length so browsers/download managers show accurate file size
      // and don't stall waiting for an unknown-length stream on large 100-200MB files
      if (streamRes.headers['content-length']) {
        res.setHeader('Content-Length', streamRes.headers['content-length']);
      }
      
      return streamRes.data.pipe(res);
    }
    
    // Local storage fallback
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

// Public: Submit support feedback from general website
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

// Admin: Save web portal link configuration
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

// Admin: Upload APK release
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

// Admin: Delete APK release from filesystem & database
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

// Admin: Receive a single binary chunk from a chunked APK upload.
// Each request is ~10MB so it safely passes through Nginx's client_max_body_size.
// Route uses express.raw() so the binary body is available as req.body (Buffer).
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

// Admin: Finalize a chunked APK upload — assemble all chunks into myportal.apk.
app.post('/api/admin/apk-finalize', auth, adminAuth, async (req, res) => {
  try {
    const { totalChunks, totalSize } = req.body;
    if (!totalChunks || totalChunks < 1) {
      return res.status(400).json({ message: 'totalChunks is required.' });
    }

    const finalApkPath = path.join(uploadDir, 'myportal.apk');

    // Remove old APK if it exists
    if (fs.existsSync(finalApkPath)) {
      fs.unlinkSync(finalApkPath);
      console.log('🗑️  Deleted old myportal.apk before assembly.');
    }

    // Verify all chunks exist before assembling
    for (let i = 0; i < totalChunks; i++) {
      const cp = path.join(chunkDir, `chunk_${i}`);
      if (!fs.existsSync(cp)) {
        return res.status(400).json({ message: `Missing chunk ${i}. Upload may be incomplete.` });
      }
    }

    // Assemble chunks in order into myportal.apk
    const writeStream = fs.createWriteStream(finalApkPath);
    for (let i = 0; i < totalChunks; i++) {
      const cp = path.join(chunkDir, `chunk_${i}`);
      const chunkData = fs.readFileSync(cp);
      writeStream.write(chunkData);
    }
    writeStream.end();

    // Wait for the write stream to finish
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Clean up all chunk temp files
    for (let i = 0; i < totalChunks; i++) {
      try { fs.unlinkSync(path.join(chunkDir, `chunk_${i}`)); } catch {}
    }

    const assembledSize = fs.statSync(finalApkPath).size;
    console.log(`✅ APK assembled successfully: ${(assembledSize / 1024 / 1024).toFixed(2)} MB`);

    // Build the download URL using backend base URL
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

// Admin: Save APK Cloudinary CDN URL and size metadata (KEPT for backwards compatibility)
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