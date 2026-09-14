const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'project-62238635-aae4-41f4-880' });
admin.auth().listUsers(100)
  .then((listUsersResult) => {
    listUsersResult.users.forEach((userRecord) => {
      console.log(userRecord.uid, userRecord.email);
    });
  })
  .catch((error) => {
    console.log('Error listing users:', error);
  });
