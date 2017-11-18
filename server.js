var dotenv = require('dotenv').config();
var express = require('express');
var app = express();
var path = require('path');
var twilio = require('twilio');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var session = require('express-session');
var accountSid = process.env.ACC_ID;
var authToken = process.env.AUTH_TOKEN;
mongoose.connect(process.env.MONGO);

var client = new twilio(accountSid, authToken);
app.use(express.static('public'));

app.use(session({
    secret: 'pinga',
    cookie:{maxAge:600000}

}));

/*client.messages.create({
    body: 'This is the second message you are getting, congrats. This is still working!!',
    to: process.env.TO_NUM,
    from: process.env.FROM_NUM
}).then(function(data) {
  console.log('Administrator notified');
}).catch(function(err) {
  console.error('Could not notify administrator');
  console.error(err);
});
*/

var Item = mongoose.model('Item',{
    sensorID: Number,
    itemName: String,
    isLocked: Boolean
});



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));


function isAuthenticated(req, res, next) {
    sess = req.session;
    console.log("Checking for authentication (isAuthenticated)")
    if(sess.user){
        console.log("User '"+sess.user+ "' is authenticated!")
        next();
}   else if (!sess.user){
    console.log("User not authenticated!")
    res.redirect('/');
}
}

app.get('/',function(req,res){
    res.sendFile(__dirname+'/public/index.html');
})

//gets sent from arduino
app.post('/registerDevice',function(req,res){
    var sensorID = req.body.sensorID;
    //var itemName = req.body.itemName;
    var device = new Item({
        sensorID: sensorID,
        isLocked: false
    });
    device.save();
    res.sendStatus(200);
})

//gets sent from web frontend
app.post('/registerName',function(req,res){
    var itemName = req.body.itemName;
    var sensorID = req.body.sensorID;
    Item.update({'sensorID' : sensorID},{'itemName':itemName},function(error,data){
        if(error){
            console.log(error)
        }
        else{
            res.sendStatus(200);
        }
    });
})

app.get('/findAll', function(req, res){
  Item.find({}, function(err, data){
      if(err){
          console.log(err)
      }
      else{
          res.json(data);
      }
  });
});

app.get('/changeState/:sensorID',function(req,res){
    Item.findOne({'sensorID' : req.params.sensorID}).exec(function(error,data){
        if(error){
            console.log(error);
        }
        else{
            if(data.isLocked){
                Item.update(
                  { 'sensorID' : req.params.sensorID },
                  { 'isLocked' : false },
                  function(error2,data2){
                    if(error2){
                        console.log(error2);
                    }
                    else{
                        res.send(200);
                    }

                });
            }
            else{
                Item.update(
                  { 'sensorID' : req.params.sensorID },
                  { 'isLocked' : true },
                  function(error2,data2){
                      if(error2){
                          console.log(error2);
                      }
                      else{
                          res.send(200);
                      }

                })
            }

        }
    })
})

app.get('/checkState/:sensorID', function(req,res){
    Item.findOne({'sensorID' : req.params.sensorID}).exec(function(error,data){
        if(error){
            console.log(error);
        }
        else{
            console.log(data);
            User.findOne({'sensorID':req.params.sensorID}).exec(function(error2,data2){
                if(data2 && !error2){
                    console.log(data2);
                    //twilio stuff
                }
                else if(error2){
                    console.log(error);
                }
                else{
                    res.send(200);
                }

            })
        }
    })
});

app.post('/addUser', function(req, res){

  if(req.body.userName && req.body.password){
    var user = new User({
      userName : req.body.userName,
      password : req.body.password,
      sensorID:[]
    });
    user.save()
  }
  res.sendStatus(200);
});

app.post('/login',function(req,res){
    sess = req.session;
    var userName = req.params.userName;
    var password = req.params.password;
    User.findOne({'userName':userName}).exec(function(error,data){
        if(error){
            console.log(error);
        }
        else{
            if(data){
                if(password === data.password){
                    sess.user = data.userName;
                    res.redirect('/dashboard');
                }
                else{
                    res.redirect('/');
                }
            }
        }
    })
})



// Listen for requests at this port
app.listen(8080,function(){
  console.log('listening on localhost');
});
