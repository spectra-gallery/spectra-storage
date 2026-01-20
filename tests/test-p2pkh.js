// const wallet = require('../controllers/wallet.controller.js');
// const ordinal = require('../controllers/ordinal.controller.js');
// const discord = require('../middlewares/discord');
require('dotenv').config();
const db = require('../models');

db.mongoose
    .connect(process.env.MONGO_URI2, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log('Successfully connect to MongoDB.');
      // initial();
    })
    .catch((err) => {
      console.error('Connection error', err);
      process.exit();
    })
    .then(() => {
      /*
        const obj = {
            id: "64e4abdc6949ae6d8ebf05ae",
            amount: 0.0001 * Math.pow(10, 8) | 0,
            recieverAddress: "1E2cndDzTgwER8geQn7vajV8mGtggJbp6D"
        }
        wallet.autoTransaction(obj.id, obj.amount, obj.recieverAddress)
        .then((result) => {
            console.log(result);
        }*/

      /*
        const hash =
        '5e815b1b6b8e09474585903f5b700de118346b20b578fbeb42d5ec0b0b065791i0';

        ordinal.updateOrdinalData(hash)
        .then((result) => {
            console.log(result);
        }


        ).catch((err) => {
            console.log(err);
        })
        */
      /*
        discord.sendNotification("test", "test");
        */

    });
