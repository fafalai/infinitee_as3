// *******************************************************************************************************************************************************************************************
// Internal functions
function doNewUser(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      var hash = '';
      var salt = global.CreatePlainUUID();
      var uuid = global.CreatePlainUUID();
      var sha512 = new global.jssha('SHA-512', 'TEXT');
      var isclient = !__.isUNB(world.clientid);

      sha512.update(world.pwd + salt);
      hash = sha512.getHash('HEX');

      tx.query
      (
        'insert into users (customers_id,uid,pwd,salt,uuid,name,clients_id,isadmin,isclient,avatar,email,phone,userscreated_id,roletemplate_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning id,datecreated',
        [
          world.cn.custid,
          world.uid,
          hash,
          salt,
          uuid,
          __.sanitiseAsString(world.name, 50),
          __.sanitiseAsBigInt(world.clientid),
          __.sanitiseAsBool(world.isadmin),
          __.sanitiseAsBool(isclient),
          world.avatar,
          __.sanitiseAsString(world.email, 100),
          __.sanitiseAsString(world.mobile, 20),
          world.cn.userid,
          __.sanitiseAsBigInt(world.roletemplateid)
        ],
        function(err, result)
        {
          if (!err)
          {
            var userid = result.rows[0].id;
            var datecreated = global.moment(result.rows[0].datecreated).format('YYYY-MM-DD HH:mm:ss');

            if(!__.isUNB(world.roletemplateid))
            {
              world.useruuid = uuid;
              return doUpdateUserPermissionFromRoleTemplate(tx, world)
                .then(
                  resolve({ userid: userid, datecreated: datecreated, usercreated: world.cn.uname, uuid: uuid })
                )
                .catch(
                  reject(err)
                );
            }
            else
              resolve({userid: userid, datecreated: datecreated, usercreated: world.cn.uname,uuid: uuid});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doExpireUser(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update users set dateexpired=now(),usersexpired_id=$1 where customers_id=$2 and uuid=$3 and dateexpired is null returning dateexpired',
        [
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsString(world.useruuid)
        ],
        function(err, result)
        {
          if (!err)
          {
            var dateexpired = global.moment(result.rows[0].dateexpired).format('YYYY-MM-DD HH:mm:ss');

            resolve({dateexpired: dateexpired, userexpired: world.cn.uname});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doCheckUidExists(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'select u1.id from users u1 where u1.customers_id=$1 and u1.uid=$2 and u1.uuid!=$3 and u1.dateexpired is null',
        [
          world.cn.custid,
          __.sanitiseAsString(world.username),
          __.sanitiseAsString(world.useruuid)
        ],
        function(err, result)
        {
          if (!err)
          {
            if ((result.rows.length == 0) || __.isNull(result.rows[0].id))
              resolve(undefined);
            else
              reject({message: global.text_useralreadyregistered});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doChangePassword(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      if (!__.isUNB(world.pwd))
      {
        var salt = global.CreatePlainUUID();
        var sha512 = new global.jssha('SHA-512', 'TEXT');

        sha512.update(world.pwd + salt);

        tx.query
        (
          'update users set pwd=$1,salt=$2 where customers_id=$3 and uuid=$4',
          [
            sha512.getHash('HEX'),
            salt,
            world.cn.custid,
            world.useruuid
          ],
          function(err, result)
          {
            if (!err)
              resolve(undefined);
            else
              reject(err);
          }
        );
      }
      else
        resolve(undefined);
    }
  );
  return promise;
}

function doSyncUsersPermissionFromRoleTemplate(tx, world) {
  return new global.rsvp.Promise(
    (resolve, reject) => {
      let sqltext = 'SELECT u1.uuid, u1.name FROM users u1 WHERE u1.customers_id=$1 AND u1.dateexpired IS NULL AND u1.roletemplate_id=$2',
          value = [
            world.cn.custid,
            world.roletemplateid
          ];

      tx.query(sqltext, value, (err, result) => {
        if (!err) {
          let sqltext =
            'SELECT canvieworders, cancreateorders, ' +
            'canviewinvoices, cancreateinvoices, ' +
            'canviewinventory, cancreateinventory, ' +
            'canviewpayroll, cancreatepayroll, ' +
            'canviewproducts, cancreateproducts, ' +
            'canviewclients, cancreateclients, ' +
            'canviewcodes, cancreatecodes, ' +
            'canviewusers, cancreateusers, ' +
            'canviewbuilds, cancreatebuilds, ' +
            'canviewtemplates, cancreatetemplates, ' +
            'canviewbanking, cancreatebanking, ' +
            'canviewpurchasing, cancreatepurchasing, ' +
            'canviewalerts, cancreatealerts, ' +
            'canviewdashboard, cancreatedashboard FROM roletemplates WHERE customers_id=$1 AND dateexpired IS NULL AND id=$2',
            value = 
            [
              world.cn.custid,
              __.sanitiseAsBigInt(world.roletemplateid)
            ];

          tx.query(sqltext, value, (err, result2) => {
              if (!err) {
                let tasks = [];
                result.rows.forEach(user => {
                  tasks.push(
                    (callback) => {
                      let sqltext =
                        'UPDATE users SET ' +
                        'canvieworders=$1,cancreateorders=$2,' +
                        'canviewinvoices=$3,cancreateinvoices=$4,' +
                        'canviewinventory=$5,cancreateinventory=$6,' +
                        'canviewpayroll=$7,cancreatepayroll=$8,' +
                        'canviewproducts=$9,cancreateproducts=$10,' +
                        'canviewclients=$11,cancreateclients=$12,' +
                        'canviewcodes=$13,cancreatecodes=$14,' +
                        'canviewusers=$15,cancreateusers=$16,' +
                        'canviewbuilds=$17,cancreatebuilds=$18,' +
                        'canviewtemplates=$19,cancreatetemplates=$20,' +
                        'canviewbanking=$21,cancreatebanking=$22,' +
                        'canviewpurchasing=$23,cancreatepurchasing=$24,' +
                        'canviewalerts=$25,cancreatealerts=$26,' +
                        'canviewdashboard=$27,cancreatedashboard=$28 ' +
                        'WHERE customers_id=$29 AND uuid=$30',
                        value = 
                        [
                          __.sanitiseAsBigInt(result2.rows[0].canvieworders),
                          __.sanitiseAsBigInt(result2.rows[0].cancreateorders),
                          __.sanitiseAsBigInt(result2.rows[0].canviewinvoices),
                          __.sanitiseAsBigInt(result2.rows[0].cancreateinvoices),
                          __.sanitiseAsBigInt(result2.rows[0].canviewinventory),
                          __.sanitiseAsBigInt(result2.rows[0].cancreateinventory),
                          __.sanitiseAsBigInt(result2.rows[0].canviewpayroll),
                          __.sanitiseAsBigInt(result2.rows[0].cancreatepayroll),
                          __.sanitiseAsBigInt(result2.rows[0].canviewproducts),
                          __.sanitiseAsBigInt(result2.rows[0].cancreateproducts),
                          __.sanitiseAsBigInt(result2.rows[0].canviewclients),
                          __.sanitiseAsBigInt(result2.rows[0].cancreateclients),
                          __.sanitiseAsBigInt(result2.rows[0].canviewcodes),
                          __.sanitiseAsBigInt(result2.rows[0].cancreatecodes),
                          __.sanitiseAsBigInt(result2.rows[0].canviewusers),
                          __.sanitiseAsBigInt(result2.rows[0].cancreateusers),
                          __.sanitiseAsBigInt(result2.rows[0].canviewbuilds),
                          __.sanitiseAsBigInt(result2.rows[0].cancreatebuilds),
                          __.sanitiseAsBigInt(result2.rows[0].canviewtemplates),
                          __.sanitiseAsBigInt(result2.rows[0].cancreatetemplates),
                          __.sanitiseAsBigInt(result2.rows[0].canviewbanking),
                          __.sanitiseAsBigInt(result2.rows[0].cancreatebanking),
                          __.sanitiseAsBigInt(result2.rows[0].canviewpurchasing),
                          __.sanitiseAsBigInt(result2.rows[0].cancreatepurchasing),
                          __.sanitiseAsBigInt(result2.rows[0].canviewalerts),
                          __.sanitiseAsBigInt(result2.rows[0].cancreatealerts),
                          __.sanitiseAsBigInt(result2.rows[0].canviewdashboard),
                          __.sanitiseAsBigInt(result2.rows[0].cancreatedashboard),
                          world.cn.custid,
                          __.sanitiseAsString(user.uuid)
                        ];

                        tx.query(sqltext, value, (err, result3) => {
                          if(!err){
                            callback(null, result3);
                          }else {
                            callback(err);
                          }
                        });
                    }
                  );
                });

                global.async.series(
                  tasks,
                  (err, results) => {
                    if (!err) {
                      resolve(results);
                    } else
                      reject(err);
                  });
              }
            });
        } else
          reject(err);
      })
    }
  )
}

function doUpdateUserPermissionFromRoleTemplate(tx, world){
  console.log(world.useruuid);
  return new global.rsvp.Promise(
    (resolve, reject) => {
      tx.query
      (
        'SELECT canvieworders, cancreateorders, '+
        'canviewinvoices, cancreateinvoices, '+
        'canviewinventory, cancreateinventory, '+
        'canviewpayroll, cancreatepayroll, '+
        'canviewproducts, cancreateproducts, '+
        'canviewclients, cancreateclients, '+
        'canviewcodes, cancreatecodes, '+
        'canviewusers, cancreateusers, '+
        'canviewbuilds, cancreatebuilds, '+
        'canviewtemplates, cancreatetemplates, '+
        'canviewbanking, cancreatebanking, '+
        'canviewpurchasing, cancreatepurchasing, '+
        'canviewalerts, cancreatealerts, '+
        'canviewdashboard, cancreatedashboard FROM roletemplates WHERE customers_id=$1 AND dateexpired IS NULL AND id=$2' ,
        [
          world.cn.custid,
          __.sanitiseAsBigInt(world.roletemplateid)
        ],
        (err, result) => {
          if(!err)
          {
            let row = result.rows[0];
            tx.query(
              'UPDATE users SET '+
              'canvieworders=$1,cancreateorders=$2,'+
              'canviewinvoices=$3,cancreateinvoices=$4,'+
              'canviewinventory=$5,cancreateinventory=$6,'+
              'canviewpayroll=$7,cancreatepayroll=$8,'+
              'canviewproducts=$9,cancreateproducts=$10,'+
              'canviewclients=$11,cancreateclients=$12,'+
              'canviewcodes=$13,cancreatecodes=$14,'+
              'canviewusers=$15,cancreateusers=$16,'+
              'canviewbuilds=$17,cancreatebuilds=$18,'+
              'canviewtemplates=$19,cancreatetemplates=$20,'+
              'canviewbanking=$21,cancreatebanking=$22,'+
              'canviewpurchasing=$23,cancreatepurchasing=$24,'+
              'canviewalerts=$25,cancreatealerts=$26,'+
              'canviewdashboard=$27,cancreatedashboard=$28 '+
              'WHERE customers_id=$29 AND uuid=$30',
              [
                __.sanitiseAsBigInt(row.canvieworders),
                __.sanitiseAsBigInt(row.cancreateorders),
                __.sanitiseAsBigInt(row.canviewinvoices),
                __.sanitiseAsBigInt(row.cancreateinvoices),
                __.sanitiseAsBigInt(row.canviewinventory),
                __.sanitiseAsBigInt(row.cancreateinventory),
                __.sanitiseAsBigInt(row.canviewpayroll),
                __.sanitiseAsBigInt(row.cancreatepayroll),
                __.sanitiseAsBigInt(row.canviewproducts),
                __.sanitiseAsBigInt(row.cancreateproducts),
                __.sanitiseAsBigInt(row.canviewclients),
                __.sanitiseAsBigInt(row.cancreateclients),
                __.sanitiseAsBigInt(row.canviewcodes),
                __.sanitiseAsBigInt(row.cancreatecodes),
                __.sanitiseAsBigInt(row.canviewusers),
                __.sanitiseAsBigInt(row.cancreateusers),
                __.sanitiseAsBigInt(row.canviewbuilds),
                __.sanitiseAsBigInt(row.cancreatebuilds),
                __.sanitiseAsBigInt(row.canviewtemplates),
                __.sanitiseAsBigInt(row.cancreatetemplates),
                __.sanitiseAsBigInt(row.canviewbanking),
                __.sanitiseAsBigInt(row.cancreatebanking),
                __.sanitiseAsBigInt(row.canviewpurchasing),
                __.sanitiseAsBigInt(row.cancreatepurchasing),
                __.sanitiseAsBigInt(row.canviewalerts),
                __.sanitiseAsBigInt(row.cancreatealerts),
                __.sanitiseAsBigInt(row.canviewdashboard),
                __.sanitiseAsBigInt(row.cancreatedashboard),
                world.cn.custid,
                __.sanitiseAsString(world.useruuid)
              ],
              (err, result2) => {
                if(!err){
                  resolve({uuid: world.useruuid});
                }
                else{
                  reject(err);
                }
              }
            )
          }
          else
            reject(err);
        }
      );
    }
  )
}

function doSaveUser(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update users set uid=$1,name=$2,isadmin=$3,email=$4,phone=$5,avatar=$6,isclient=$7,clients_id=$8,userscreated_id=$9,roletemplate_id=$12 where customers_id=$10 and uuid=$11 returning datemodified',
        [
          __.sanitiseAsString(world.uid),
          __.sanitiseAsString(world.name),
          __.sanitiseAsBool(world.isadmin),
          __.sanitiseAsString(world.email),
          __.sanitiseAsString(world.mobile),
          __.sanitiseAsString(world.avatar),
          __.sanitiseAsBigInt(world.isclient),
          __.sanitiseAsBigInt(world.clientid),
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsString(world.useruuid),
          __.sanitiseAsBigInt(world.roletemplateid)
        ],
        function(err, result)
        {
          if (!err)
          {
            let datemodified = global.moment(result.rows[0].datemodified).format('YYYY-MM-DD HH:mm:ss');

            if(!__.isUNB(world.roletemplateid)){
              return doUpdateUserPermissionFromRoleTemplate(tx, world)
              .then(resolve({datemodified: datemodified, usermodified: world.cn.uname}))
              .catch(reject(err));
            }
            else
              resolve({datemodified: datemodified, usermodified: world.cn.uname});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doSaveUserPermissions(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update users set ' +
        'canvieworders=$1,' +
        'cancreateorders=$2,' +
        'canviewinvoices=$3,' +
        'cancreateinvoices=$4,' +
        'canviewproducts=$5,' +
        'cancreateproducts=$6,' +
        'canviewinventory=$7,' +
        'cancreateinventory=$8,' +
        'canviewpayroll=$9,' +
        'cancreatepayroll=$10,' +
        'canviewcodes=$11,' +
        'cancreatecodes=$12,' +
        'canviewclients=$13,' +
        'cancreateclients=$14,' +
        'canviewusers=$15,' +
        'cancreateusers=$16,' +
        'canviewbuilds=$17,' +
        'cancreatebuilds=$18,' +
        'canviewtemplates=$19,' +
        'cancreatetemplates=$20,' +
        'canviewbanking=$21,' +
        'cancreatebanking=$22,' +
        'canviewpurchasing=$23,' +
        'cancreatepurchasing=$24,' +
        'canviewalerts=$25,' +
        'cancreatealerts=$26,' +
        'canviewdashboard=$27,' +
        'cancreatedashboard=$28,' +
        'datemodified=now(),' +
        'usersmodified_id=$29 ' +
        'where ' +
        'customers_id=$30 ' +
        'and ' +
        'uuid=$31',
        [
          world.permissions.canvieworders,
          world.permissions.cancreateorders,
          world.permissions.canviewinvoices,
          world.permissions.cancreateinvoices,
          world.permissions.canviewproducts,
          world.permissions.cancreateproducts,
          world.permissions.canviewinventory,
          world.permissions.cancreateinventory,
          world.permissions.canviewpayroll,
          world.permissions.cancreatepayroll,
          world.permissions.canviewcodes,
          world.permissions.cancreatecodes,
          world.permissions.canviewclients,
          world.permissions.cancreateclients,
          world.permissions.canviewusers,
          world.permissions.cancreateusers,
          world.permissions.canviewbuilds,
          world.permissions.cancreatebuilds,
          world.permissions.canviewtemplates,
          world.permissions.cancreatetemplates,
          world.permissions.canviewbanking,
          world.permissions.cancreatebanking,
          world.permissions.canviewpurchasing,
          world.permissions.cancreatepurchasing,
          world.permissions.canviewalerts,
          world.permissions.cancreatealerts,
          world.permissions.canviewdashboard,
          world.permissions.cancreatedashboard,
          world.cn.userid,
          world.cn.custid,
          world.useruuid
        ],
        function(err, result)
        {
          if (!err)
            resolve({uuid: world.useruuid});
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doGetUserAuthDetails(tx, uid)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'select ' +
        'u1.id,' +
        'u1.uid,' +
        'u1.uuid,' +
        'u1.email,' +
        'u1.name uname,' +
        'u1.isadmin,' +
        'u1.isclient,' +
        'u1.customers_id custid,' +
        'u1.salt,' +
        'u1.pwd,' +
        'u1.avatar,' +
        'u1.canvieworders,' +
        'u1.cancreateorders,' +
        'u1.canviewinvoices,' +
        'u1.cancreateinvoices,' +
        'u1.canviewproducts,' +
        'u1.cancreateproducts,' +
        'u1.canviewinventory,' +
        'u1.cancreateinventory,' +
        'u1.canviewpayroll,' +
        'u1.cancreatepayroll,' +
        'u1.canviewcodes,' +
        'u1.cancreatecodes,' +
        'u1.canviewclients,' +
        'u1.cancreateclients,' +
        'u1.canviewusers,' +
        'u1.cancreateusers,' +
        'u1.canviewbuilds,' +
        'u1.cancreatebuilds,' +
        'u1.canviewtemplates,' +
        'u1.cancreatetemplates,' +
        'u1.canviewbanking,' +
        'u1.cancreatebanking,' +
        'u1.canviewpurchasing,' +
        'u1.cancreatepurchasing,' +
        'u1.canviewalerts,' +
        'u1.cancreatealerts,' +
        'u1.canviewdashboard,' +
        'u1.cancreatedashboard,' +
        'u1.clients_id clientid ' +
        'from ' +
        'users u1 left join users u2 on (u1.userscreated_id=u2.id) ' +
        '         left join users u3 on (u1.usersmodified_id=u3.id) ' +
        '         left join customers c1 on (u1.customers_id=c1.id) ' +
        'where ' +
        'u1.uid=$1 ' +
        'and ' +
        'u1.dateexpired is null',
        [
          uid
        ],
        function(err, result)
        {
          if (!err)
          {
            if (result.rows.length == 1)
              resolve(result.rows[0]);
            else
              reject({message: global.text_unablegetuserauthdetails});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doAuthPassword(tx, user, pwd)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      var sha512 = new global.jssha('SHA-512', 'TEXT');

      sha512.update(pwd + user.salt);

      if (user.pwd == sha512.getHash('HEX'))
        resolve(user);
      else
        reject({message: global.text_invalidlogin});
    }
  );
  return promise;
}

function doLogin(tx, user, remote)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      // 1. create a session hash - random string with rep's UUID as the salt...
      // 2. insert new connection entry...
      var hash = '';
      var sha512 = new global.jssha('SHA-512', 'TEXT');

      sha512.update(user.uuid + global.moment().format('YYYY-MM-DD HH:mm:ss'));
      hash = sha512.getHash('HEX');

      tx.query
      (
        'insert into connections (userscreated_id,session,ip,port,family) values ($1,$2,$3,$4,$5) returning id',
        [
          user.id,
          hash,
          remote.address,
          remote.port,
          remote.family
        ],
        function(err, result)
        {
          if (!err)
          {
            if (result.rows.length == 1)
            {
              user.connectionid = result.rows[0].id;
              user.session = hash;
              resolve(user);
            }
            else
              reject({message: global.text_unableloginuser});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doLogout(tx, user)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      if (!__.isUN(user.connectionid))
      {
        tx.query
        (
          'update connections set dateexpired=now() where id=$1',
          [
            user.connectionid
          ],
          function(err, result)
          {
            if (!err)
              resolve(user);
            else
              reject(err);
          }
        );
      }
      else
      {
        tx.query
        (
          'select c1.id from connections c1 where c1.userscreated_id=$1 and c1.dateexpired is null order by c1.id desc limit 1',
          [
            user.userid
          ],
          function(err, result)
          {
            if (!err && (result.rows.length > 0))
            {
              tx.query
              (
                'update connections set dateexpired=now() where id=$1',
                [
                  result.rows[0].id
                ],
                function(err, result)
                {
                  if (!err)
                    resolve(user);
                  else
                    reject(err);
                }
              );
            }
            else
              reject(err);
          }
        );
      }
    }
  );
  return promise;
}

function doNewUserRoleTemplates(tx, world) {
  return new global.rsvp.Promise(
    (resolve, reject) => {
      tx.query(
        'INSERT INTO roletemplates' +
        '(customers_id, name, datecreated, userscreated_id, '+
        'canvieworders, cancreateorders, '+
        'canviewinvoices, cancreateinvoices, '+
        'canviewinventory, cancreateinventory, '+
        'canviewpayroll, cancreatepayroll, '+
        'canviewproducts, cancreateproducts, '+
        'canviewclients, cancreateclients, '+
        'canviewcodes, cancreatecodes, '+
        'canviewusers, cancreateusers, '+
        'canviewbuilds, cancreatebuilds, '+
        'canviewtemplates, cancreatetemplates, '+
        'canviewbanking, cancreatebanking, '+
        'canviewpurchasing, cancreatepurchasing, '+
        'canviewalerts, cancreatealerts, '+
        'canviewdashboard, cancreatedashboard)' +
        'VALUES ($1, $2, now(), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31) ' +
        'returning id',
        [
          world.cn.custid,
          __.sanitiseAsString(world.name, 50),
          world.cn.userid,
          world.roles.canvieworders,
          world.roles.cancreateorders,
          world.roles.canviewinvoices,
          world.roles.cancreateinvoices,
          world.roles.canviewinventory,
          world.roles.cancreateinventory,
          world.roles.canviewpayroll,
          world.roles.cancreatepayroll,
          world.roles.canviewproducts,
          world.roles.cancreateproducts,
          world.roles.canviewclients,
          world.roles.cancreateclients,
          world.roles.canviewcodes,
          world.roles.cancreatecodes,
          world.roles.canviewusers,
          world.roles.cancreateusers,
          world.roles.canviewbuilds,
          world.roles.cancreatebuilds,
          world.roles.canviewtemplates,
          world.roles.cancreatetemplates,
          world.roles.canviewbanking,
          world.roles.cancreatebanking,
          world.roles.canviewpurchasing,
          world.roles.cancreatepurchasing,
          world.roles.canviewalerts,
          world.roles.cancreatealerts,
          world.roles.canviewdashboard,
          world.roles.cancreatedashboard,
        ],
        (err, result) => 
        {
          if (!err) {
            tx.query(
              'SELECT rp1.id, rp1.name, rp1.datecreated, rp1.datemodified, u1.name usercreated, u2.name usermodified ' +
              'FROM roletemplates rp1 ' +
              'left join users u1 on (rp1.userscreated_id=u1.id) ' +
              'left join users u2 on (rp1.usersmodified_id=u2.id) ' +
              'WHERE rp1.dateexpired IS NULL AND rp1.customers_id=$1 AND rp1.id=$2',
              [
                world.cn.custid,
                result.rows[0].id
              ],
              (err, result2) => {
                if (!err)
                  resolve(result2);
                else
                  reject(err);
              }
            )
          } else {
            reject(err);
          }
        });
    }
  );
}

function doSaveUserRoleTemplates(tx, world) {
  return new global.rsvp.Promise(
    (resolve, reject) => {
      let sqltext =
        'UPDATE roletemplates SET name=$1, datemodified=now(), usersmodified_id=$3, ' +
        'canvieworders=$4, cancreateorders=$5, ' +
        'canviewinvoices=$6, cancreateinvoices=$7, ' +
        'canviewinventory=$8, cancreateinventory=$9, ' +
        'canviewpayroll=$10, cancreatepayroll=$11, ' +
        'canviewproducts=$12, cancreateproducts=$13, ' +
        'canviewclients=$14, cancreateclients=$15, ' +
        'canviewcodes=$16, cancreatecodes=$17, ' +
        'canviewusers=$18, cancreateusers=$19, ' +
        'canviewbuilds=$20, cancreatebuilds=$21, ' +
        'canviewtemplates=$22, cancreatetemplates=$23, ' +
        'canviewbanking=$24, cancreatebanking=$25, ' +
        'canviewpurchasing=$26, cancreatepurchasing=$27, ' +
        'canviewalerts=$28, cancreatealerts=$29, ' +
        'canviewdashboard=$30, cancreatedashboard=$31 ' +
        'WHERE customers_id=$2 AND dateexpired IS NULL AND id=$32';

      let value = [
        __.sanitiseAsString(world.name, 50),
        world.cn.custid,
        world.cn.userid,
        world.roles.canvieworders,
        world.roles.cancreateorders,
        world.roles.canviewinvoices,
        world.roles.cancreateinvoices,
        world.roles.canviewinventory,
        world.roles.cancreateinventory,
        world.roles.canviewpayroll,
        world.roles.cancreatepayroll,
        world.roles.canviewproducts,
        world.roles.cancreateproducts,
        world.roles.canviewclients,
        world.roles.cancreateclients,
        world.roles.canviewcodes,
        world.roles.cancreatecodes,
        world.roles.canviewusers,
        world.roles.cancreateusers,
        world.roles.canviewbuilds,
        world.roles.cancreatebuilds,
        world.roles.canviewtemplates,
        world.roles.cancreatetemplates,
        world.roles.canviewbanking,
        world.roles.cancreatebanking,
        world.roles.canviewpurchasing,
        world.roles.cancreatepurchasing,
        world.roles.canviewalerts,
        world.roles.cancreatealerts,
        world.roles.canviewdashboard,
        world.roles.cancreatedashboard,
        world.roletemplateid
      ];
      tx.query(sqltext, value, (err, result) => {
        if (!err) {
          if(world.sync){
            return doSyncUsersPermissionFromRoleTemplate(tx, world)
              .then(resolve(result))
              .catch(err=>reject(err))
          }
          else
          {
            resolve(result);
            // tx.query(
            //   'SELECT rp1.id, rp1.name, rp1.datecreated, rp1.datemodified, u1.name usercreated, u2.name usermodified ' +
            //   'FROM roletemplates rp1 ' +
            //   'left join users u1 on (rp1.userscreated_id=u1.id) ' +
            //   'left join users u2 on (rp1.usersmodified_id=u2.id) ' +
            //   'WHERE rp1.dateexpired IS NULL AND rp1.customers_id=$1 AND rp1.id=$2',
            //   [
            //     world.cn.custid,
            //     result.roletemplateid
            //   ],
            //   (err, result2) => {
            //     if (!err)
            //       resolve(result2);
            //     else
            //       reject(err);
            //   }
            // )
          }
        } else {
          reject(err);
        }
      });
    }
  );
}

function doRemoveUserRoleTemplate(tx, world) {
  return new global.rsvp.Promise(
    (resolve, reject) => {
      tx.query(
        'UPDATE roletemplates SET dateexpired=now(), usersexpired_id=$1' + 
        'WHERE customers_id=$2 AND dateexpired IS NULL AND id=$3',
        [
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.roletemplateid)
        ],
        (err, result) => {
          if(!err) {
            resolve(result);
          } else {
            reject(err);
          }
        }
      );
    }
  );
}

// *******************************************************************************************************************************************************************************************
// Public functions
function LoginUser(spark, eventname, fguid, uid, pwd, pdata)
{
  var msg = '[' + eventname + '] ';
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var tx = new global.pgtx(client);
        tx.begin
        (
          function(err)
          {
            if (!err)
            {
              doGetUserAuthDetails(tx, uid).then
              (
                function(user)
                {
                  return doAuthPassword(tx, user, pwd);
                }
              ).then
              (
                function(user)
                {
                  return doLogin(tx, user, spark.remote.address);
                }
              ).then
              (
                function(user)
                {
                  tx.commit
                  (
                    function(err)
                    {
                      if (!err)
                      {
                        done();

                        var channels = user.isadmin ? [global.custchannelprefix + user.custid, global.config.env.notificationschannel, global.config.env.statschannel, global.config.env.chatchannel] : [global.custchannelprefix + user.custid];
                        var expires = global.moment().add({days: 7}).format('YYYY-MM-DD HH:mm:ss');
                        var uid = user.uid.toUpperCase();

                        // Find user in cache...
                        global.users.get
                        (
                          global.config.redis.prefix + user.uuid,
                          function(err, uuidobj)
                          {
                            if (!err)
                            {
                              global.safejsonparse
                              (
                                uuidobj,
                                function(err, uo)
                                {
                                  if (!err)
                                  {
                                    uo.sparkid = spark.id;
                                    uo.fguid = fguid;
                                    uo.custid = user.custid,
                                    uo.userid = user.id;
                                    uo.uid = uid;
                                    uo.uname = user.uname;
                                    uo.isadmin = user.isadmin;
                                    uo.isclient = user.isclient;
                                    uo.clientid = user.clientid;
                                    uo.email = user.email;
                                    uo.avatar = user.avatar;
                                    uo.session = user.session;
                                    uo.expires = expires;
                                    uo.connectionid = user.connectionid;

                                    global.safejsonstringify
                                    (
                                      uo,
                                      function(err, json)
                                      {
                                        if (!err)
                                        {
                                          global.users.set(global.config.redis.prefix + user.uuid, json);
                                          spark.myUuid = user.uuid;
                                          //
                                          spark.emit
                                          (
                                            eventname,
                                            {
                                              rc: global.errcode_none,
                                              msg: global.text_success,
                                              fguid: fguid,
                                              uid: uid,
                                              uname: user.uname,
                                              uuid: user.uuid,
                                              isadmin: user.isadmin,
                                              isclient: user.isclient,
                                              clientid: user.clientid,
                                              avatar: user.avatar,
                                              session: user.session,
                                              expires: expires,
                                              channels: channels,
                                              permissions:
                                              {
                                                canvieworders: user.canvieworders,
                                                cancreateorders: user.cancreateorders,
                                                canviewinvoices: user.canviewinvoices,
                                                cancreateinvoices: user.cancreateinvoices,
                                                canviewinventory: user.canviewinventory,
                                                cancreateinventory: user.cancreateinventory,
                                                canviewpayroll: user.canviewpayroll,
                                                cancreatepayroll: user.cancreatepayroll,
                                                canviewproducts: user.canviewproducts,
                                                cancreateproducts: user.cancreateproducts,
                                                canviewclients: user.canviewclients,
                                                cancreateclients: user.cancreateclients,
                                                canviewcodes: user.canviewcodes,
                                                cancreatecodes: user.cancreatecodes,
                                                canviewusers: user.canviewusers,
                                                cancreateusers: user.cancreateusers,
                                                canviewbuilds: user.canviewbuilds,
                                                cancreatebuilds: user.cancreatebuilds,
                                                canviewtemplates: user.canviewtemplates,
                                                cancreatetemplates: user.cancreatetemplates,
                                                canviewbanking: user.canviewbanking,
                                                cancreatebanking: user.cancreatebanking,
                                                canviewpurchasing: user.canviewpurchasing,
                                                cancreatepurchasing: user.cancreatepurchasing,
                                                canviewalerts: user.canviewalerts,
                                                cancreatealerts: user.cancreatealerts,
                                                canviewdashboard: user.canviewdashboard,
                                                cancreatedashboard: user.cancreatedashboard
                                              },
                                              pdata: pdata
                                            }
                                          );
                                          global.pr.sendToRoom(global.config.env.notificationschannel, 'useronline', {uuid: user.uuid, uname: user.uname});
                                        }
                                        else
                                        {
                                          msg += global.text_unablestringifyjson + ' ' + uid;
                                          global.log.error({loginuser: true}, msg);
                                          spark.emit(global.eventerror, {rc: global.errcode_jsonstringify, msg: global.text_unablestringifyjson, eventname: eventname, pdata: pdata});
                                        }
                                      }
                                    );
                                  }
                                  else
                                  {
                                    msg += global.text_unableparsejson + ' ' + uuidobj;
                                    global.log.error({loginuser: true}, msg);
                                    spark.emit(global.eventerror, {rc: global.errcode_jsonparse, msg: global.text_unableparsejson, eventname: eventname, pdata: pdata});
                                  }
                                }
                              );
                            }
                            else
                            {
                              var uo =
                              {
                                sparkid: spark.id,
                                fguid: fguid,
                                uid: uid,
                                uname: user.name,
                                email: user.email,
                                isadmin: user.isadmin,
                                isclient: user.isclient,
                                mapicon: user.mapicon,
                                session: user.session,
                                expires: expires,
                                connectionid: user.connectionid
                              }

                              global.safejsonstringify
                              (
                                uo,
                                function(err, json)
                                {
                                  if (!err)
                                  {
                                    global.users.set(global.config.redis.prefix + user.uuid, json);
                                    spark.myUuid = user.uuid;
                                    //
                                    spark.emit(eventname, {rc: global.errcode_none, msg: global.text_success, fguid: fguid, uid: uid, uname: user.name, uuid: user.uuid, isadmin: user.isadmin, session: user.session, expires: expires, channels: channels, pdata: pdata});
                                  }
                                  else
                                  {
                                    msg += global.text_unablestringifyjson + ' ' + uid;
                                    global.log.error({loginuser: true}, msg);
                                    spark.emit(global.eventerror, {rc: global.errcode_jsonstringify, msg: global.text_unablestringifyjson, eventname: eventname, pdata: pdata});
                                  }
                                }
                              );
                            }
                          }
                        );
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();

                            msg += global.text_tx + ' ' + err.message;
                            global.log.error({loginuser: true}, msg);
                            spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: pdata});
                          }
                        );
                      }
                    }
                  );
                }
              ).then
              (
                null,
                function(err)
                {
                  tx.rollback
                  (
                    function(ignore)
                    {
                      done();

                      msg += global.text_generalexception + ' ' + err.message;
                      spark.emit(global.eventerror, {rc: global.errcode_invalidlogin, msg: msg, pdata: pdata});
                      global.log.error({loginuser: true}, msg);
                    }
                  );
                }
              )
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({loginuser: true}, msg);
              spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({loginuser: true}, global.text_nodbconnection);
        spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: pdata});
      }
    }
  );
}

function LogoutUser(spark, eventname, fguid, pdata)
{
  var msg = '[' + eventname + '] ';
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var tx = new global.pgtx(client);
        tx.begin
        (
          function(err)
          {
            if (!err)
            {
              global.users.get
              (
                global.config.redis.prefix + spark.myUuid,
                function(err, uuidobj)
                {
                  if (!err)
                  {
                    global.safejsonparse
                    (
                      uuidobj,
                      function(err, uo)
                      {
                        if (!err)
                        {
                          uo.fguid = null;
                          uo.session = null;

                          global.safejsonstringify
                          (
                            uo,
                            function(err, json)
                            {
                              if (!err)
                              {
                                global.users.set(global.config.redis.prefix + spark.myUuid, json);
                                spark.myUuid = '';

                                doLogout(tx, uo).then
                                (
                                  function(ignore)
                                  {
                                    tx.commit
                                    (
                                      function(err)
                                      {
                                        if (!err)
                                        {
                                          done();
                                          spark.emit(eventname, {rc: global.errcode_none, msg: global.text_success, pdata: pdata});

                                          if (!__.isUNB(uo.uuid))
                                            global.pr.sendToRoom(global.config.env.notificationschannel, 'userlogout', {uuid: uo.uuid, uname: uo.uname});
                                        }
                                        else
                                        {
                                          tx.rollback
                                          (
                                            function(ignore)
                                            {
                                              done();
                                              msg += global.text_tx + ' ' + err.message;
                                              global.log.error({logoutuser: true}, msg);
                                              spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: pdata});
                                            }
                                          );
                                        }
                                      }
                                    );
                                  }
                                ).then
                                (
                                  null,
                                  function(err)
                                  {
                                    tx.rollback
                                    (
                                      function(ignore)
                                      {
                                        done();

                                        msg += global.text_generalexception;
                                        if (!__.isUN(err))
                                          msg += ' ' + err.message;
                                        spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: pdata});
                                        global.log.error({logoutuser: true}, msg);
                                      }
                                    );
                                  }
                                );
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({logoutuser: true}, msg);
              spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({logoutuser: true}, global.text_nodbconnection);
        spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: pdata});
      }
    }
  );
}

function ListUsers(world)
{
  var msg = '[' + world.eventname + '] ';
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var clause = '';
        var binds = [world.cn.custid];

        if (!world.cn.isadmin)
        {
          clause = 'and u1.id=$2';
          binds.push(world.cn.userid);
        }

        client.query
        (
          'select ' +
          'u1.uuid,' +
          'u1.name uname,' +
          'u1.email,' +
          'u1.uid,' +
          'u1.phone,' +
          'u1.notes,' +
          'u1.isadmin,' +
          'u1.isclient,' +
          'u1.avatar,' +
          'u1.canvieworders,' +
          'u1.cancreateorders,' +
          'u1.canviewinvoices,' +
          'u1.cancreateinvoices,' +
          'u1.canviewinventory,' +
          'u1.cancreateinventory,' +
          'u1.canviewpayroll,' +
          'u1.cancreatepayroll,' +
          'u1.canviewproducts,' +
          'u1.cancreateproducts,' +
          'u1.canviewclients,' +
          'u1.cancreateclients,' +
          'u1.canviewcodes,' +
          'u1.cancreatecodes,' +
          'u1.canviewusers,' +
          'u1.cancreateusers,' +
          'u1.canviewbuilds,' +
          'u1.cancreatebuilds,' +
          'u1.canviewtemplates,' +
          'u1.cancreatetemplates,' +
          'u1.canviewbanking,' +
          'u1.cancreatebanking,' +
          'u1.canviewpurchasing,' +
          'u1.cancreatepurchasing,' +
          'u1.canviewalerts,' +
          'u1.cancreatealerts,' +
          'u1.canviewdashboard,' +
          'u1.cancreatedashboard,' +
          'u1.clients_id clientid,' +
          'u1.datecreated,' +
          'u1.datemodified,' +
          'u2.name usercreated,' +
          'u3.name usermodified,' +
          'rt1.name rolename,' +
          'll1.datecreated lastlogindate,' +
          'll1.dateexpired lastlogoutdate,' +
          'll1.ip lastloginip ' +
          'from ' +
          'users u1 left join users u2 on (u1.userscreated_id=u2.id) ' +
          '         left join users u3 on (u1.usersmodified_id=u3.id) ' +
          '         left join roletemplates rt1 on (u1.roletemplate_id=rt1.id) ' +
          '         left join getlastlogin(u1.id) ll1 on (1=1) ' +
          'where ' +
          'u1.customers_id=$1 ' +
          clause +
          'and ' +
          'u1.dateexpired is null ' +
          'order by ' +
          'u1.name',
          binds,
          function(err, result)
          {
            done();

            if (!err)
            {
              // JS returns date with TZ info/format, need in ISO format...
              result.rows.forEach
              (
                function(u)
                {
                  if (!__.isUN(u.notes))
                    u.notes = __.unescapeHTML(u.notes);

                  if (!__.isUN(u.datemodified) && !__.isNull(u.datemodified))
                    u.datemodified = global.moment(u.datemodified).format('YYYY-MM-DD HH:mm:ss');

                  if (!__.isUN(u.lastlogindate))
                    u.lastlogindate = global.moment(u.lastlogindate).format('YYYY-MM-DD HH:mm:ss');

                  if (!__.isUN(u.lastlogoutdate))
                    u.lastlogoutdate = global.moment(u.lastlogoutdate).format('YYYY-MM-DD HH:mm:ss');

                  u.datecreated = global.moment(u.datecreated).format('YYYY-MM-DD HH:mm:ss');
                }
              );

              world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
            }
            else
            {
              msg += global.text_generalexception + ' ' + err.message;
              global.log.error({listusers: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({listusers: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function LoadUser(world)
{
  var msg = '[' + world.eventname + '] ';
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        client.query
        (
          'select ' +
          'u1.uuid,' +
          'u1.name,' +
          'u1.email,' +
          'u1.uid,' +
          'u1.phone,' +
          'u1.notes,' +
          'u1.isadmin,' +
          'u1.isclient,' +
          'u1.avatar,' +
          'u1.canvieworders,' +
          'u1.cancreateorders,' +
          'u1.canviewinvoices,' +
          'u1.cancreateinvoices,' +
          'u1.canviewinventory,' +
          'u1.cancreateinventory,' +
          'u1.canviewpayroll,' +
          'u1.cancreatepayroll,' +
          'u1.canviewproducts,' +
          'u1.cancreateproducts,' +
          'u1.canviewclients,' +
          'u1.cancreateclients,' +
          'u1.canviewcodes,' +
          'u1.cancreatecodes,' +
          'u1.canviewusers,' +
          'u1.cancreateusers,' +
          'u1.canviewbuilds,' +
          'u1.cancreatebuilds,' +
          'u1.canviewtemplates,' +
          'u1.cancreatetemplates,' +
          'u1.canviewbanking,' +
          'u1.cancreatebanking,' +
          'u1.canviewpurchasing,' +
          'u1.cancreatepurchasing,' +
          'u1.canviewalerts,' +
          'u1.cancreatealerts,' +
          'u1.canviewdashboard,' +
          'u1.cancreatedashboard,' +
          'u1.clients_id clientid, ' +
          'u1.roletemplate_id roletemplateid '+
          'from ' +
          'users u1 left join users u2 on (u1.userscreated_id=u2.id) ' +
          '         left join users u3 on (u1.usersmodified_id=u3.id) ' +
          'where ' +
          'u1.customers_id=$1 ' +
          'and ' +
          'u1.uuid=$2',
          [
            world.cn.custid,
            world.useruuid
          ],
          function(err, result)
          {
            done();

            if (!err)
            {
              // JS returns date with TZ info/format, need in ISO format...
              result.rows.forEach
              (
                function(u)
                {
                  if (!__.isUN(u.notes))
                    u.notes = __.unescapeHTML(u.notes);
                }
              );

              world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, user: result.rows[0], pdata: world.pdata});
            }
            else
            {
              msg += global.text_generalexception + ' ' + err.message;
              global.log.error({loaduser: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({loaduser: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function ListConnectedUsers(world)
{
  var msg = '[' + world.eventname + '] ';
  //
  global.usersLoggedIn().then
  (
    function(users)
    {
      world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: users, pdata: world.pdata});
    }
  ).then
  (
    null,
    function(err)
    {
      world.spark.emit(global.eventerror, {rc: global.errcode_nodata, msg: global.text_nodata, pdata: world.pdata});
    }
  );
}

function SaveUser(world)
{
  var msg = '[' + world.eventname + '] ';
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var tx = new global.pgtx(client);
        tx.begin
        (
          function(err)
          {
            if (!err)
            {
              doCheckUidExists(tx, world).then
              (
                function(ignore)
                {
                  return doSaveUser(tx, world);
                }
              ).then
              (
                function(result)
                {
                  tx.commit
                  (
                    function(err)
                    {
                      if (!err)
                      {
                        done();
                        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, useruuid: world.userid, datemodified: result.datemodified, usermodified: result.usermodified, pdata: world.pdata});
                        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'usersaved', {useruuid: world.userid, datemodified: result.datemodified, usermodified: result.usermodified}, world.spark.id);

                        // Find existing entry to update...
                        global.users.get
                        (
                          global.config.redis.prefix + world.useruuid,
                          function(err, uuidobj)
                          {
                            if (!err)
                            {
                              global.safejsonparse
                              (
                                uuidobj,
                                function(err, uo)
                                {
                                  if (!err)
                                  {
                                    uo.uid = world.username;
                                    uo.isadmin = world.isadmin;
                                    uo.isclient = world.isclient;
                                    uo.clientid = world.clientid;
                                    uo.email = world.email;
                                    uo.uname = world.name;

                                    global.safejsonstringify
                                    (
                                      uo,
                                      function(err, json)
                                      {
                                        if (!err)
                                          global.users.set(global.config.redis.prefix + world.useruuid, json);
                                        else
                                        {
                                          msg += global.text_unablestringifyjson + ' ' + world.uid;
                                          global.log.error({saveuser: true}, msg);
                                        }
                                      }
                                    );
                                  }
                                  else
                                  {
                                    msg += global.text_unableparsejson + ' ' + uuidobj;
                                    global.log.error({saveuser: true}, msg);
                                  }
                                }
                              );
                            }
                          }
                        );
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error({saveuser: true}, msg);
                            world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                          }
                        );
                      }
                    }
                  );
                }
              ).then
              (
                null,
                function(err)
                {
                  tx.rollback
                  (
                    function(ignore)
                    {
                      done();

                      msg += global.text_generalexception + ' ' + err.message;
                      global.log.error({saveuser: true}, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
                    }
                  );
                }
              )
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({saveuser: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({saveuser: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function SaveUserPermissions(world)
{
  var msg = '[' + world.eventname + '] ';
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var tx = new global.pgtx(client);
        tx.begin
        (
          function(err)
          {
            if (!err)
            {
              doSaveUserPermissions(tx, world).then
              (
                function(result)
                {
                  tx.commit
                  (
                    function(err)
                    {
                      if (!err)
                      {
                        done();
                        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, pdata: world.pdata});
                        global.pr.sendToRoom(global.custchannelprefix + world.cn.custid, 'userpermissionssaved', {uuid: result.uuid});
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error({saveuserpermissions: true}, msg);
                            world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                          }
                        );
                      }
                    }
                  );
                }
              ).then
              (
                null,
                function(err)
                {
                  tx.rollback
                  (
                    function(ignore)
                    {
                      done();

                      msg += global.text_generalexception + ' ' + err.message;
                      global.log.error({saveuserpermissions: true}, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
                    }
                  );
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({saveuserpermissions: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({saveuserpermissions: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function NewUserRoleTemplates(world) {
  global.modhelpers.doSimpleFunc1Tx
    (
    world,
    doNewUserRoleTemplates,
    function (err, result) {
      if (!err) {
        world.spark.emit(world.eventname, { rc: global.errcode_none, msg: global.text_success, rs: result.rows, pdata: world.pdata });
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'userroletemplatessaved', { rs: result.rows }, world.spark.id);
      }
    }
    );
}

function SaveUserRoleTemplates(world) {
  global.modhelpers.doSimpleFunc1Tx
    (
    world,
    doSaveUserRoleTemplates,
    function (err, result) {
      if (!err) {
        world.spark.emit(world.eventname, { rc: global.errcode_none, msg: global.text_success, pdata: world.pdata });
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'saveuserroletemplates', {}, world.spark.id);
        global.pr.sendToRoom(global.custchannelprefix + world.cn.custid, 'usersaved', {}, world.spark.id);
      }
    }
    );
}

function ListUserRoleTemplates(world) {
  global.modhelpers.doSimpleQuery(
    world,
    'SELECT rt1.id, rt1.name, rt1.datecreated, rt1.datemodified, u1.name usercreated, u2.name usermodified, rt1.canvieworders, rt1.cancreateorders, rt1.canviewinvoices, rt1.cancreateinvoices, rt1.canviewinventory, rt1.cancreateinventory, rt1.canviewpayroll, rt1.cancreatepayroll, rt1.canviewproducts, rt1.cancreateproducts, rt1.canviewclients, rt1.cancreateclients, rt1.canviewcodes, rt1.cancreatecodes, rt1.canviewusers, rt1.cancreateusers, rt1.canviewbuilds, rt1.cancreatebuilds, rt1.canviewtemplates, rt1.cancreatetemplates, rt1.canviewbanking, rt1.cancreatebanking, rt1.canviewpurchasing, rt1.cancreatepurchasing, rt1.canviewalerts, rt1.cancreatealerts, rt1.canviewdashboard, rt1.cancreatedashboard ' +
    'FROM roletemplates rt1 LEFT JOIN users u1 on (rt1.userscreated_id=u1.id) LEFT JOIN users u2 on (rt1.usersmodified_id=u2.id) ' +
    'WHERE rt1.customers_id=$1 AND rt1.dateexpired IS NULL ORDER BY id',
    [
      world.cn.custid,
    ],
    (err, result) => {
      if (!err) {
        world.spark.emit(world.eventname, { rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata });
      }
    }
  );
}

function RemoveUserRoleTemplates(world) {
  global.modhelpers.doSimpleFunc1Tx
  (
  world,
  doRemoveUserRoleTemplate,
  function (err, result) {
    if (!err) {
      world.spark.emit(world.eventname, { rc: global.errcode_none, msg: global.text_success, rs: result.rows, pdata: world.pdata });
      global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'userroletemplatessaved', { rs: result.rows }, world.spark.id);
    }
  }
  );
}

function ExpireUser(world)
{
  var msg = '[' + world.eventname + '] ';
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var tx = new global.pgtx(client);
        tx.begin
        (
          function(err)
          {
            if (!err)
            {
              doExpireUser(tx, world).then
              (
                function(result)
                {
                  tx.commit
                  (
                    function(err)
                    {
                      if (!err)
                      {
                        done();
                        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, useruuid: world.useruuid, dateexpired: result.dateexpired, userexpired: result.userexpired, pdata: world.pdata});
                        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'userexpired', {useruuid: world.useruuid, dateexpired: result.dateexpired, userexpired: result.userexpired}, world.spark.id);

                        // Remove user from cache...
                        global.users.del(global.config.redis.prefix + world.useruuid);
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error({expireuser: true}, msg);
                            world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                          }
                        );
                      }
                    }
                  );
                }
              ).then
              (
                null,
                function(err)
                {
                  tx.rollback
                  (
                    function(ignore)
                    {
                      done();

                      msg += global.text_generalexception + ' ' + err.message;
                      global.log.error({expireuser: true}, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
                    }
                  );
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({expireuser: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({expireuser: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function NewUser(world)
{
  var msg = '[' + world.eventname + '] ';
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var tx = new global.pgtx(client);
        tx.begin
        (
          function(err)
          {
            if (!err)
            {
              doNewUser(tx, world).then
              (
                function(result)
                {
                  tx.commit
                  (
                    function(err)
                    {
                      if (!err)
                      {
                        done();

                        // Add new user to cache...
                        var uo =
                        {
                          sparkid: null,
                          fguid: null,
                          uid: world.uid,
                          uname: world.name,
                          isadmin: world.isadmin,
                          isclient: world.isclient,
                          clientid: world.clientid,
                          email: world.email,
                          session: null,
                          expires: null,
                          connectionid: null,
                          uuid:result.uuid
                        }

                        global.safejsonstringify
                        (
                          uo,
                          function(err, json)
                          {
                            if (!err)
                            {
                              global.users.set(global.config.redis.prefix + result.uuid, json);
                            }
                            else
                            {
                              msg += global.text_unablestringifyjson + ' ' + world.uid;
                              global.log.error({newuser: true}, msg);
                            }
                          }
                        );

                        world.spark.emit
                        (
                          world.eventname,
                          {
                            rc: global.errcode_none,
                            msg: global.text_success,
                            uuid: result.uuid,
                            datecreated: result.datecreated,
                            usercreated: result.usercreated,
                            pdata: world.pdata
                          }
                        );
                        global.pr.sendToRoomExcept
                        (
                          global.custchannelprefix + world.cn.custid,
                          // 'usercreated',
                          'newuser',
                          {
                            uuid: result.uuid,
                            datecreated: result.datecreated,
                            usercreated: result.usercreated,
                          },
                          world.spark.id
                        );
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error({newuser: true}, msg);
                            world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                          }
                        );
                      }
                    }
                  );
                }
              ).then
              (
                null,
                function(err)
                {
                  tx.rollback
                  (
                    function(ignore)
                    {
                      done();

                      msg += global.text_generalexception + ' ' + err.message;
                      global.log.error({newuser: true}, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
                    }
                  );
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({newuser: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({newuser: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function ChangePassword(world)
{
  var msg = '[' + world.eventname + '] ';
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var tx = new global.pgtx(client);
        tx.begin
        (
          function(err)
          {
            if (!err)
            {
              doChangePassword(tx, world).then
              (
                function(ignore)
                {
                  tx.commit
                  (
                    function(err)
                    {
                      if (!err)
                      {
                        done();
                        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, useruuid: world.useruuid, pdata: world.pdata});
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error({changepassword: true}, msg);
                            world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                          }
                        );
                      }
                    }
                  );
                }
              ).then
              (
                null,
                function(err)
                {
                  tx.rollback
                  (
                    function(ignore)
                    {
                      done();

                      msg += global.text_generalexception + ' ' + err.message;
                      global.log.error({changepassword: true}, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
                    }
                  );
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({changepassword: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({changepassword: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function InitConnectionCache()
{
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        client.query
        (
          'select u1.id,u1.customers_id custid,u1.uid,u1.uuid,u1.email,u1.phone,u1.name,u1.isadmin,u1.isclient,clients_id clientid from users u1 where u1.dateexpired is null',
          function(err, users)
          {
            done();

            if (!err)
            {
              var expires = global.moment().add({days: 7}).format('YYYY-MM-DD HH:mm:ss');
              users.rows.forEach
              (
                function(user)
                {
                  if (!__.isNull(user.uuid) && !__.isBlank(user.uuid))
                  {
                    var channels = user.isadmin ? [global.custchannelprefix + user.custid, global.config.env.notificationschannel, global.config.env.statschannel] : [global.custchannelprefix + user.custid];
                    // Try to find existing cache entry, so we can merge some values which may have already been set...
                    global.userFromUid(user.uid).then
                    (
                      function(uo)
                      {
                        // Following already set or need to be left alone...
                        // uo.userid
                        // uo.devicetoken
                        uo.sparkid = null;
                        uo.fguid = null;
                        uo.custid = user.custid;
                        uo.uid = user.uid.toUpperCase();
                        uo.uname = user.name;
                        uo.isadmin = user.isadmin;
                        uo.isclient = user.isclient;
                        uo.clientid = user.clientid;
                        uo.email = user.email;
                        uo.session = null;
                        uo.expires = expires;
                        uo.connectionid = null;
                        uo.uuid = user.uuid;

                        if (__.isUndefined(uo.channels))
                          uo.channels = channels;

                        global.safejsonstringify
                        (
                          uo,
                          function(err, json)
                          {
                            if (!err)
                              global.users.set(global.config.redis.prefix + user.uuid, json);
                            else
                              global.log.error({initconnectioncache: true}, global.text_unablestringifyjson + ' ' + user.uuid);
                          }
                        );
                      }
                    ).then
                    (
                      null,
                      function(err)
                      {
                        var uo =
                        {
                          sparkid: null,
                          fguid: null,
                          userid: user.id,
                          custid: user.custid,
                          uid: user.uid.toUpperCase(),
                          uname: user.name,
                          isadmin: user.isadmin,
                          isclient: user.isclient,
                          clientid: user.clientid,
                          email: user.email,
                          channels:channels,
                          session: null,
                          expires: expires,
                          connectionid: null,
                          uuid: user.uuid
                        };

                        global.safejsonstringify
                        (
                          uo,
                          function(err, json)
                          {
                            if (!err)
                              global.users.set(global.config.redis.prefix + user.uuid, json);
                            else
                              global.log.error({initconnectioncache: true}, global.text_unablestringifyjson + ' ' + user.uuid);
                          }
                        );
                      }
                    );
                  }
                }
              );
              global.ConsoleLog('========== InitConnectionCache');
            }
            else
              global.log.error({initconnectioncache: true}, 'Unable to init connections cache');
          }
        );
      }
      else
        global.log.error({initconnectioncache: true}, global.text_nodbconnection);
    }
  );
}

function CheckUserUid(world)
{
  var msg = '[' + world.eventname + '] ';
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var binds = [world.cn.custid, world.uid];
        var clause = '';

        if (!__.isNull(world.useruuid))
        {
          clause = ' and u1.uuid!=$3';
          binds.push(world.useruuid);
        }

        client.query
        (
          'select ' +
          'u1.uuid,' +
          'u1.uid,' +
          'u1.name ' +
          'from ' +
          'users u1 ' +
          'where ' +
          'u1.customers_id=$1 ' +
          'and ' +
          'u1.dateexpired is null ' +
          'and ' +
          'u1.uid=$2' +
          clause,
          binds,
          function(err, result)
          {
            done();

            if (!err)
              world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
            else
            {
              msg += global.text_generalexception + ' ' + err.message;
              global.log.error({checkuseruid: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({checkuseruid: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function CreateCredentials(uid, pwd)
{
  var salt = global.CreatePlainUUID();
  var uuid = global.CreatePlainUUID();
  var sha512 = new global.jssha('SHA-512', 'TEXT');

  sha512.update(pwd + salt);

  console.log('Salt: ' + salt);
  console.log('UUID: ' + uuid);
  console.log('Hash: ' + sha512.getHash('HEX'));
}

// *******************************************************************************************************************************************************************************************
// Internal functions

// *******************************************************************************************************************************************************************************************
// Public functions
module.exports.CreateCredentials = CreateCredentials;
module.exports.NewUser = NewUser;
module.exports.LoginUser = LoginUser;
module.exports.LogoutUser = LogoutUser;
module.exports.ListUsers = ListUsers;
module.exports.LoadUser = LoadUser;
module.exports.ListConnectedUsers = ListConnectedUsers;
module.exports.SaveUser = SaveUser;
module.exports.ExpireUser = ExpireUser;
module.exports.SaveUserPermissions = SaveUserPermissions;
module.exports.ChangePassword = ChangePassword;
module.exports.CheckUserUid = CheckUserUid;
module.exports.InitConnectionCache = InitConnectionCache;

module.exports.SaveUserRoleTemplates = SaveUserRoleTemplates;
module.exports.NewUserRoleTemplates = NewUserRoleTemplates;
module.exports.ListUserRoleTemplates = ListUserRoleTemplates;
module.exports.RemoveUserRoleTemplates = RemoveUserRoleTemplates;
