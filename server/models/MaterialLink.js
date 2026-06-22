const mongoose = require('mongoose');

const MaterialLinkSchema = new mongoose.Schema({
    
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    
    courseUrl:    { type: String, required: true },
    courseName:   { type: String, default: '' },
    courseCode:   { type: String, default: '' },   
    sectionCode:  { type: String, default: '' },   
    teacherName:  { type: String, default: '' },   
    semester:     { type: String, default: '' },

    
    links: [{
        fileName:    { type: String, default: '' },   
        description: { type: String, default: '' },
        downloadUrl: { type: String, default: '' },   
        token:       { type: String, default: '' },   
        processed:   { type: Boolean, default: false }, 
        sequenceNumber: { type: Number }
    }],

    
    processed:    { type: Boolean, default: false },
    processedAt:  { type: Date },
    lastScrapedAt:{ type: Date, default: Date.now }
});


MaterialLinkSchema.index({ userId: 1, courseUrl: 1 }, { unique: true });

MaterialLinkSchema.index({ userId: 1, processed: 1 });

module.exports = mongoose.model('MaterialLink', MaterialLinkSchema);
