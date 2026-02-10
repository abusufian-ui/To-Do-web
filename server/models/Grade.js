const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  courseUrl: { type: String, required: true, unique: true }, // <--- UNIQUE ID
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

module.exports = mongoose.model('Grade', gradeSchema);