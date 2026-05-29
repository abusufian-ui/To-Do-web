const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config({path: './.env'});
mongoose.connect(process.env.REACT_APP_MONGODB_URI).then(async () => {
  const users = await User.find({ _id: { $in: ['6a1a0edb208583201ef6c495', '698d82ecfd7fe29835c9a7e8'] } });
  console.log('Users:', users.map(u => ({ id: u._id, name: u.name, portalId: u.portalId, rollNo: u.rollNo })));
  process.exit(0);
});
