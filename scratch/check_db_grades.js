const mongoose = require('mongoose');

const uri = "mongodb://admin_rs:Sufian56@ac-lebwcdg-shard-00-00.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-01.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-02.t1ps9ec.mongodb.net:27017/my_portal_db?ssl=true&authSource=admin&retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(async () => {
    console.log("Connected to MongoDB successfully!");
    const Grade = mongoose.model('Grade', new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId,
      courseUrl: String,
      courseName: String,
      assessments: mongoose.Schema.Types.Mixed
    }, { collection: 'grades' }));

    const grades = await Grade.find({}).lean();
    console.log(`Found ${grades.length} grades in total.`);
    
    // Find grades that have assessments
    const withAssessments = grades.filter(g => g.assessments && g.assessments.length > 0);
    console.log(`Grades with assessments: ${withAssessments.length}`);
    
    withAssessments.forEach(g => {
      console.log(`- Course: ${g.courseName} (${g.courseUrl})`);
      g.assessments.forEach(a => {
        console.log(`  - Category: ${a.name} (weight: ${a.weight}, pct: ${a.percentage})`);
        if (a.details) {
          a.details.forEach(d => {
            console.log(`    - Item: ${d.name} (${d.obtainedMarks}/${d.maxMarks})`);
          });
        }
      });
    });

    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Error connecting to MongoDB:", err);
  });
