const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseUrl: { type: String, required: true }, // Removed global unique constraint
  courseName: { type: String, default: "Unknown Course" },
  totalPercentage: { type: String, default: "0" },
  lastUpdated: { type: Date, default: Date.now },
  assessments: [
    {
      name: String,      
      weight: String,     
      percentage: String, 
      details: [
        {
          name: String,          
          maxMarks: String,      
          obtainedMarks: String, 
          classAverage: String,  
          percentage: String     
        }
      ]
    }
  ]
});

// COMPOUND INDEX: Ensures a courseUrl is unique ONLY per user
gradeSchema.index({ userId: 1, courseUrl: 1 }, { unique: true });

module.exports = mongoose.model('Grade', gradeSchema);