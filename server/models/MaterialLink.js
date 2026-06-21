const mongoose = require('mongoose');

const MaterialLinkSchema = new mongoose.Schema({
    // Who scraped these links
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Portal course URL (the unique key for this link set)
    courseUrl:    { type: String, required: true },
    courseName:   { type: String, default: '' },
    courseCode:   { type: String, default: '' },   // e.g. CSAL-3253-B1
    sectionCode:  { type: String, default: '' },   // e.g. B1 (last part of code)
    teacherName:  { type: String, default: '' },   // from Course model instructors[]
    semester:     { type: String, default: '' },

    // The raw download links scraped from the portal this session
    links: [{
        fileName:    { type: String, default: '' },   // display name from portal table
        description: { type: String, default: '' },
        downloadUrl: { type: String, default: '' },   // full URL (session-bound)
        token:       { type: String, default: '' },   // the token at end of URL
        processed:   { type: Boolean, default: false }, // tracking progress
        sequenceNumber: { type: Number }
    }],

    // Processing state — reset to false on every sync so processor always re-runs
    processed:    { type: Boolean, default: false },
    processedAt:  { type: Date },
    lastScrapedAt:{ type: Date, default: Date.now }
});

// One record per user per course URL
MaterialLinkSchema.index({ userId: 1, courseUrl: 1 }, { unique: true });
// Index for fetching all unprocessed
MaterialLinkSchema.index({ userId: 1, processed: 1 });

module.exports = mongoose.model('MaterialLink', MaterialLinkSchema);
