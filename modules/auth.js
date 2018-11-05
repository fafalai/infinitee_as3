// *******************************************************************************************************************************************************************************************
// Internal functions
function doNewUser(tx, world) {
  const promise = new global.rsvp.Promise(((resolve, reject) => {
    let hash = '';
    const salt = global.CreatePlainUUID();
    const uuid = global.CreatePlainUUID();
    const sha512 = new global.jssha('SHA-512', 'TEXT');
    const isclient = !__.isUNB(world.clientid);

    sha512.update(world.pwd + salt);
    hash = sha512.getHash('HEX');

    tx.query(
      'insert into users (customers_id,uid,pwd,salt,uuid,name,clients_id,isadmin,isclient,avatar,email,phone,userscreated_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id,datecreated',
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
      ],
      (err, result) => {
        if (!err) {
          const userid = result.rows[0].id;
          const datecreated = global.moment(result.rows[0].datecreated).format('YYYY-MM-DD HH:mm:ss');
          resolve({
            userid,
            datecreated,
            usercreated: world.cn.uname,
            uuid,
          });
        } else reject(err);
      },
    );
  }));
  return promise;
}

function doExpireUser(tx, world) {
  const promise = new global.rsvp.Promise(((resolve, reject) => {
    tx.query(
      'update users set dateexpired=now(),usersexpired_id=$1 where customers_id=$2 and uuid=$3 and dateexpired is null returning dateexpired',
      [world.cn.userid, world.cn.custid, __.sanitiseAsString(world.useruuid)],
      (err, result) => {
        if (!err) {
          const dateexpired = global.moment(result.rows[0].dateexpired).format('YYYY-MM-DD HH:mm:ss');

          resolve({ dateexpired, userexpired: world.cn.uname });
        } else reject(err);
      },
    );
  }));
  return promise;
}

function doCheckUidExists(tx, world) {
  const promise = new global.rsvp.Promise(((resolve, reject) => {
    tx.query(
      'select u1.id from users u1 where u1.customers_id=$1 and u1.uid=$2 and u1.uuid!=$3 and u1.dateexpired is null',
      [world.cn.custid, __.sanitiseAsString(world.username), __.sanitiseAsString(world.useruuid)],
      (err, result) => {
        if (!err) {
          if (result.rows.length == 0 || __.isNull(result.rows[0].id)) resolve(undefined);
          else reject({ message: global.text_useralreadyregistered });
        } else reject(err);
      },
    );
  }));
  return promise;
}

function doChangePassword(tx, world) {
  const promise = new global.rsvp.Promise(((resolve, reject) => {
    if (!__.isUNB(world.pwd)) {
      const salt = global.CreatePlainUUID();
      const sha512 = new global.jssha('SHA-512', 'TEXT');

      sha512.update(world.pwd + salt);

      tx.query(
        'update users set pwd=$1,salt=$2 where customers_id=$3 and uuid=$4',
        [sha512.getHash('HEX'), salt, world.cn.custid, world.useruuid],
        (err, result) => {
          if (!err) resolve(undefined);
          else reject(err);
        },
      );
    } else resolve(undefined);
  }));
  return promise;
}

function doSaveUser(tx, world) {
  const promise = new global.rsvp.Promise(((resolve, reject) => {
    tx.query(
      'update users set uid=$1,name=$2,isadmin=$3,email=$4,phone=$5,avatar=$6,isclient=$7,clients_id=$8,userscreated_id=$9 where customers_id=$10 and uuid=$11 returning datemodified',
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
      ],
      (err, result) => {
        if (!err) {
          const datemodified = global
            .moment(result.rows[0].datemodified)
            .format('YYYY-MM-DD HH:mm:ss');

          resolve({ datemodified, usermodified: world.cn.uname });
        } else reject(err);
      },
    );
  }));
  return promise;
}

function doSaveUserPermissions(tx, world) {
  const promise = new global.rsvp.Promise(((resolve, reject) => {
    tx.query(
      'update users set '
				+ 'canvieworders=$1,'
				+ 'cancreateorders=$2,'
				+ 'canviewinvoices=$3,'
				+ 'cancreateinvoices=$4,'
				+ 'canviewproducts=$5,'
				+ 'cancreateproducts=$6,'
				+ 'canviewinventory=$7,'
				+ 'cancreateinventory=$8,'
				+ 'canviewpayroll=$9,'
				+ 'cancreatepayroll=$10,'
				+ 'canviewcodes=$11,'
				+ 'cancreatecodes=$12,'
				+ 'canviewclients=$13,'
				+ 'cancreateclients=$14,'
				+ 'canviewusers=$15,'
				+ 'cancreateusers=$16,'
				+ 'canviewbuilds=$17,'
				+ 'cancreatebuilds=$18,'
				+ 'canviewtemplates=$19,'
				+ 'cancreatetemplates=$20,'
				+ 'canviewbanking=$21,'
				+ 'cancreatebanking=$22,'
				+ 'canviewpurchasing=$23,'
				+ 'cancreatepurchasing=$24,'
				+ 'canviewalerts=$25,'
				+ 'cancreatealerts=$26,'
				+ 'canviewdashboard=$27,'
				+ 'cancreatedashboard=$28,'
				+ 'datemodified=now(),'
				+ 'usersmodified_id=$29 '
				+ 'where '
				+ 'customers_id=$30 '
				+ 'and '
				+ 'uuid=$31',
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
        world.useruuid,
      ],
      (err, result) => {
        if (!err) resolve({ uuid: world.useruuid });
        else reject(err);
      },
    );
  }));
  return promise;
}

function doGetUserAuthDetails(tx, uid) {
  const promise = new global.rsvp.Promise(((resolve, reject) => {
    tx.query(
      'select '
				+ 'u1.id,'
				+ 'u1.uid,'
				+ 'u1.uuid,'
				+ 'u1.email,'
				+ 'u1.name uname,'
				+ 'u1.isadmin,'
				+ 'u1.isclient,'
				+ 'u1.customers_id custid,'
				+ 'u1.salt,'
				+ 'u1.pwd,'
				+ 'u1.avatar,'
				+ 'u1.canvieworders,'
				+ 'u1.cancreateorders,'
				+ 'u1.canviewinvoices,'
				+ 'u1.cancreateinvoices,'
				+ 'u1.canviewproducts,'
				+ 'u1.cancreateproducts,'
				+ 'u1.canviewinventory,'
				+ 'u1.cancreateinventory,'
				+ 'u1.canviewpayroll,'
				+ 'u1.cancreatepayroll,'
				+ 'u1.canviewcodes,'
				+ 'u1.cancreatecodes,'
				+ 'u1.canviewclients,'
				+ 'u1.cancreateclients,'
				+ 'u1.canviewusers,'
				+ 'u1.cancreateusers,'
				+ 'u1.canviewbuilds,'
				+ 'u1.cancreatebuilds,'
				+ 'u1.canviewtemplates,'
				+ 'u1.cancreatetemplates,'
				+ 'u1.canviewbanking,'
				+ 'u1.cancreatebanking,'
				+ 'u1.canviewpurchasing,'
				+ 'u1.cancreatepurchasing,'
				+ 'u1.canviewalerts,'
				+ 'u1.cancreatealerts,'
				+ 'u1.canviewdashboard,'
				+ 'u1.cancreatedashboard,'
				+ 'u1.clients_id clientid '
				+ 'from '
				+ 'users u1 left join users u2 on (u1.userscreated_id=u2.id) '
				+ '         left join users u3 on (u1.usersmodified_id=u3.id) '
				+ '         left join customers c1 on (u1.customers_id=c1.id) '
				+ 'where '
				+ 'u1.uid=$1 '
				+ 'and '
				+ 'u1.dateexpired is null',
      [uid],
      (err, result) => {
        if (!err) {
          if (result.rows.length == 1) resolve(result.rows[0]);
          else reject({ message: global.text_unablegetuserauthdetails });
        } else reject(err);
      },
    );
  }));
  return promise;
}

function doAuthPassword(tx, user, pwd) {
  const promise = new global.rsvp.Promise(((resolve, reject) => {
    const sha512 = new global.jssha('SHA-512', 'TEXT');

    sha512.update(pwd + user.salt);

    if (user.pwd == sha512.getHash('HEX')) resolve(user);
    else reject({ message: global.text_invalidlogin });
  }));
  return promise;
}

function doLogin(tx, user, remote) {
  const promise = new global.rsvp.Promise(((resolve, reject) => {
    // 1. create a session hash - random string with rep's UUID as the salt...
    // 2. insert new connection entry...
    let hash = '';
    const sha512 = new global.jssha('SHA-512', 'TEXT');

    sha512.update(user.uuid + global.moment().format('YYYY-MM-DD HH:mm:ss'));
    hash = sha512.getHash('HEX');

    tx.query(
      'insert into connections (userscreated_id,session,ip,port,family) values ($1,$2,$3,$4,$5) returning id',
      [user.id, hash, remote.address, remote.port, remote.family],
      (err, result) => {
        if (!err) {
          if (result.rows.length == 1) {
            user.connectionid = result.rows[0].id;
            user.session = hash;
            resolve(user);
          } else reject({ message: global.text_unableloginuser });
        } else reject(err);
      },
    );
  }));
  return promise;
}

function doLogout(tx, user) {
  const promise = new global.rsvp.Promise(((resolve, reject) => {
    if (!__.isUN(user.connectionid)) {
      tx.query(
        'update connections set dateexpired=now() where id=$1',
        [user.connectionid],
        (err, result) => {
          if (!err) resolve(user);
          else reject(err);
        },
      );
    } else {
      tx.query(
        'select c1.id from connections c1 where c1.userscreated_id=$1 and c1.dateexpired is null order by c1.id desc limit 1',
        [user.userid],
        (err, result) => {
          if (!err && result.rows.length > 0) {
            tx.query(
              'update connections set dateexpired=now() where id=$1',
              [result.rows[0].id],
              (err, result) => {
                if (!err) resolve(user);
                else reject(err);
              },
            );
          } else reject(err);
        },
      );
    }
  }));
  return promise;
}

function doNewUserRoleTemplates(tx, world) {
  return new global.rsvp.Promise((resolve, reject) => {
    tx.query(
      'INSERT INTO roletemplates'
				+ '(customers_id, name, datecreated, userscreated_id, canvieworders, cancreateorders, canviewinvoices, cancreateinvoices, canviewinventory, cancreateinventory, canviewpayroll, cancreatepayroll, canviewproducts, cancreateproducts, canviewclients, cancreateclients, canviewcodes, cancreatecodes, canviewusers, cancreateusers, canviewbuilds, cancreatebuilds, canviewtemplates, cancreatetemplates, canviewbanking, cancreatebanking, canviewpurchasing, cancreatepurchasing, canviewalerts, cancreatealerts, canviewdashboard, cancreatedashboard)'
				+ 'VALUES ($1, $2, now(), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31) '
				+ 'returning id',
      [
        world.cn.custid,
        __.sanitiseAsString(world.name, 50),
        world.cn.userid,
        world.roles.canvieworders,
        world.roles.cancreateorders,
        world.roles.canviewinvoices,
        world.roles.cancreateinvoices,
        world.roles.canviewproducts,
        world.roles.cancreateproducts,
        world.roles.canviewinventory,
        world.roles.cancreateinventory,
        world.roles.canviewpayroll,
        world.roles.cancreatepayroll,
        world.roles.canviewcodes,
        world.roles.cancreatecodes,
        world.roles.canviewclients,
        world.roles.cancreateclients,
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
      (err, result) => {
        if (!err) {
          tx.query(
            'SELECT rp1.id, rp1.name, rp1.datecreated, rp1.datemodified, u1.name usercreated, u2.name usermodified '
							+ 'FROM roletemplates rp1 '
							+ 'left join users u1 on (rp1.userscreated_id=u1.id) '
							+ 'left join users u2 on (rp1.usersmodified_id=u2.id) '
							+ 'WHERE rp1.dateexpired IS NULL AND rp1.customers_id=$1 AND rp1.id=$2',
            [world.cn.custid, result.rows[0].id],
            (err, result2) => {
              if (!err) resolve(result2);
              else reject(err);
            },
          );
        } else {
          reject(err);
        }
      },
    );
  });
}

function doSaveUserRoleTemplates(tx, world) {
  return new global.rsvp.Promise((resolve, reject) => {
    tx.query(
      'UPDATE roletemplates SET name=$1, datemodified=now(), usersmodified_id=$3, canvieworders=$4, cancreateorders=$5, canviewinvoices=$6, cancreateinvoices=$7, canviewinventory=$8, cancreateinventory=$9, canviewpayroll=$10, cancreatepayroll=$11, canviewproducts=$12, cancreateproducts=$13, canviewclients=$14, cancreateclients=$15, canviewcodes=$16, cancreatecodes=$17, canviewusers=$18, cancreateusers=$19, canviewbuilds=$20, cancreatebuilds=$21, canviewtemplates=$22, cancreatetemplates=$23, canviewbanking=$24, cancreatebanking=$25, canviewpurchasing=$26, cancreatepurchasing=$27, canviewalerts=$28, cancreatealerts=$29, canviewdashboard=$30, cancreatedashboard=$31 '
				+ 'WHERE customers_id=$2 AND dateexpired IS NULL AND id=$32',
      [
        __.sanitiseAsString(world.name, 50),
        world.cn.custid,
        world.cn.userid,
        world.roles.canvieworders,
        world.roles.cancreateorders,
        world.roles.canviewinvoices,
        world.roles.cancreateinvoices,
        world.roles.canviewproducts,
        world.roles.cancreateproducts,
        world.roles.canviewinventory,
        world.roles.cancreateinventory,
        world.roles.canviewpayroll,
        world.roles.cancreatepayroll,
        world.roles.canviewcodes,
        world.roles.cancreatecodes,
        world.roles.canviewclients,
        world.roles.cancreateclients,
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
        world.roletemplateid,
      ],
      (err, result) => {
        if (!err) {
          tx.query(
            'SELECT rp1.id, rp1.name, rp1.datecreated, rp1.datemodified, u1.name usercreated, u2.name usermodified '
							+ 'FROM roletemplates rp1 '
							+ 'left join users u1 on (rp1.userscreated_id=u1.id) '
							+ 'left join users u2 on (rp1.usersmodified_id=u2.id) '
							+ 'WHERE rp1.dateexpired IS NULL AND rp1.customers_id=$1 AND rp1.id=$2',
            [world.cn.custid, result.roletemplateid],
            (err, result2) => {
              if (!err) resolve(result2);
              else reject(err);
            },
          );
        } else {
          reject(err);
        }
      },
    );
  });
}

// *******************************************************************************************************************************************************************************************
// Public functions
function LoginUser(spark, eventname, fguid, uid, pwd, pdata) {
  let msg = `[${eventname}] `;
  //
  global.pg.connect(
    global.cs,
    (err, client, done) => {
      if (!err) {
        const tx = new global.pgtx(client);
        tx.begin((err) => {
          if (!err) {
            doGetUserAuthDetails(tx, uid)
              .then(user => doAuthPassword(tx, user, pwd))
              .then(user => doLogin(tx, user, spark.remote.address))
              .then((user) => {
                tx.commit((err) => {
                  if (!err) {
                    done();

                    const channels = user.isadmin
                      ? [
                        global.custchannelprefix + user.custid,
                        global.config.env.notificationschannel,
                        global.config.env.statschannel,
                        global.config.env.chatchannel,
											  ]
                      : [global.custchannelprefix + user.custid];
                    const expires = global
                      .moment()
                      .add({ days: 7 })
                      .format('YYYY-MM-DD HH:mm:ss');
                    const uid = user.uid.toUpperCase();

                    // Find user in cache...
                    global.users.get(global.config.redis.prefix + user.uuid, (
                      err,
                      uuidobj,
                    ) => {
                      if (!err) {
                        global.safejsonparse(uuidobj, (err, uo) => {
                          if (!err) {
                            uo.sparkid = spark.id;
                            uo.fguid = fguid;
                            (uo.custid = user.custid), (uo.userid = user.id);
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

                            global.safejsonstringify(uo, (err, json) => {
                              if (!err) {
                                global.users.set(global.config.redis.prefix + user.uuid, json);
                                spark.myUuid = user.uuid;
                                //
                                spark.emit(eventname, {
                                  rc: global.errcode_none,
                                  msg: global.text_success,
                                  fguid,
                                  uid,
                                  uname: user.uname,
                                  uuid: user.uuid,
                                  isadmin: user.isadmin,
                                  isclient: user.isclient,
                                  clientid: user.clientid,
                                  avatar: user.avatar,
                                  session: user.session,
                                  expires,
                                  channels,
                                  permissions: {
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
                                    cancreatedashboard: user.cancreatedashboard,
                                  },
                                  pdata,
                                });
                                global.pr.sendToRoom(
                                  global.config.env.notificationschannel,
                                  'useronline',
                                  { uuid: user.uuid, uname: user.uname },
                                );
                              } else {
                                msg += `${global.text_unablestringifyjson} ${uid}`;
                                global.log.error({ loginuser: true }, msg);
                                spark.emit(global.eventerror, {
                                  rc: global.errcode_jsonstringify,
                                  msg: global.text_unablestringifyjson,
                                  eventname,
                                  pdata,
                                });
                              }
                            });
                          } else {
                            msg += `${global.text_unableparsejson} ${uuidobj}`;
                            global.log.error({ loginuser: true }, msg);
                            spark.emit(global.eventerror, {
                              rc: global.errcode_jsonparse,
                              msg: global.text_unableparsejson,
                              eventname,
                              pdata,
                            });
                          }
                        });
                      } else {
                        const uo = {
                          sparkid: spark.id,
                          fguid,
                          uid,
                          uname: user.name,
                          email: user.email,
                          isadmin: user.isadmin,
                          isclient: user.isclient,
                          mapicon: user.mapicon,
                          session: user.session,
                          expires,
                          connectionid: user.connectionid,
                        };

                        global.safejsonstringify(uo, (err, json) => {
                          if (!err) {
                            global.users.set(global.config.redis.prefix + user.uuid, json);
                            spark.myUuid = user.uuid;
                            //
                            spark.emit(eventname, {
                              rc: global.errcode_none,
                              msg: global.text_success,
                              fguid,
                              uid,
                              uname: user.name,
                              uuid: user.uuid,
                              isadmin: user.isadmin,
                              session: user.session,
                              expires,
                              channels,
                              pdata,
                            });
                          } else {
                            msg += `${global.text_unablestringifyjson} ${uid}`;
                            global.log.error({ loginuser: true }, msg);
                            spark.emit(global.eventerror, {
                              rc: global.errcode_jsonstringify,
                              msg: global.text_unablestringifyjson,
                              eventname,
                              pdata,
                            });
                          }
                        });
                      }
                    });
                  } else {
                    tx.rollback((ignore) => {
                      done();

                      msg += `${global.text_tx} ${err.message}`;
                      global.log.error({ loginuser: true }, msg);
                      spark.emit(global.eventerror, {
                        rc: global.errcode_dberr,
                        msg,
                        pdata,
                      });
                    });
                  }
                });
              })
              .then(null, (err) => {
                tx.rollback((ignore) => {
                  done();

                  msg += `${global.text_generalexception} ${err.message}`;
                  spark.emit(global.eventerror, {
                    rc: global.errcode_invalidlogin,
                    msg,
                    pdata,
                  });
                  global.log.error({ loginuser: true }, msg);
                });
              });
          } else {
            done();
            msg += `${global.text_notxstart} ${err.message}`;
            global.log.error({ loginuser: true }, msg);
            spark.emit(global.eventerror, { rc: global.errcode_dberr, msg, pdata });
          }
        });
      } else {
        done();
        global.log.error({ loginuser: true }, global.text_nodbconnection);
        spark.emit(global.eventerror, {
          rc: global.errcode_dbunavail,
          msg: global.text_nodbconnection,
          pdata,
        });
      }
    },
  );
}

function LogoutUser(spark, eventname, fguid, pdata) {
  let msg = `[${eventname}] `;
  //
  global.pg.connect(
    global.cs,
    (err, client, done) => {
      if (!err) {
        const tx = new global.pgtx(client);
        tx.begin((err) => {
          if (!err) {
            global.users.get(global.config.redis.prefix + spark.myUuid, (err, uuidobj) => {
              if (!err) {
                global.safejsonparse(uuidobj, (err, uo) => {
                  if (!err) {
                    uo.fguid = null;
                    uo.session = null;

                    global.safejsonstringify(uo, (err, json) => {
                      if (!err) {
                        global.users.set(global.config.redis.prefix + spark.myUuid, json);
                        spark.myUuid = '';

                        doLogout(tx, uo)
                          .then((ignore) => {
                            tx.commit((err) => {
                              if (!err) {
                                done();
                                spark.emit(eventname, {
                                  rc: global.errcode_none,
                                  msg: global.text_success,
                                  pdata,
                                });

                                if (!__.isUNB(uo.uuid)) {
global.pr.sendToRoom(
                                  global.config.env.notificationschannel,
                                  'userlogout',
                                  { uuid: uo.uuid, uname: uo.uname },
                                ); }
                              } else {
                                tx.rollback((ignore) => {
                                  done();
                                  msg += `${global.text_tx} ${err.message}`;
                                  global.log.error({ logoutuser: true }, msg);
                                  spark.emit(global.eventerror, {
                                    rc: global.errcode_dberr,
                                    msg,
                                    pdata,
                                  });
                                });
                              }
                            });
                          })
                          .then(null, (err) => {
                            tx.rollback((ignore) => {
                              done();

                              msg += global.text_generalexception;
                              if (!__.isUN(err)) msg += ` ${err.message}`;
                              spark.emit(global.eventerror, {
                                rc: global.errcode_fatal,
                                msg,
                                pdata,
                              });
                              global.log.error({ logoutuser: true }, msg);
                            });
                          });
                      }
                    });
                  }
                });
              }
            });
          } else {
            done();
            msg += `${global.text_notxstart} ${err.message}`;
            global.log.error({ logoutuser: true }, msg);
            spark.emit(global.eventerror, { rc: global.errcode_dberr, msg, pdata });
          }
        });
      } else {
        done();
        global.log.error({ logoutuser: true }, global.text_nodbconnection);
        spark.emit(global.eventerror, {
          rc: global.errcode_dbunavail,
          msg: global.text_nodbconnection,
          pdata,
        });
      }
    },
  );
}

function ListUsers(world) {
  let msg = `[${world.eventname}] `;
  //
  global.pg.connect(
    global.cs,
    (err, client, done) => {
      if (!err) {
        let clause = '';
        const binds = [world.cn.custid];

        if (!world.cn.isadmin) {
          clause = 'and u1.id=$2';
          binds.push(world.cn.userid);
        }

        client.query(
          `${'select '
						+ 'u1.uuid,'
						+ 'u1.name uname,'
						+ 'u1.email,'
						+ 'u1.uid,'
						+ 'u1.phone,'
						+ 'u1.notes,'
						+ 'u1.isadmin,'
						+ 'u1.isclient,'
						+ 'u1.avatar,'
						+ 'u1.canvieworders,'
						+ 'u1.cancreateorders,'
						+ 'u1.canviewinvoices,'
						+ 'u1.cancreateinvoices,'
						+ 'u1.canviewinventory,'
						+ 'u1.cancreateinventory,'
						+ 'u1.canviewpayroll,'
						+ 'u1.cancreatepayroll,'
						+ 'u1.canviewproducts,'
						+ 'u1.cancreateproducts,'
						+ 'u1.canviewclients,'
						+ 'u1.cancreateclients,'
						+ 'u1.canviewcodes,'
						+ 'u1.cancreatecodes,'
						+ 'u1.canviewusers,'
						+ 'u1.cancreateusers,'
						+ 'u1.canviewbuilds,'
						+ 'u1.cancreatebuilds,'
						+ 'u1.canviewtemplates,'
						+ 'u1.cancreatetemplates,'
						+ 'u1.canviewbanking,'
						+ 'u1.cancreatebanking,'
						+ 'u1.canviewpurchasing,'
						+ 'u1.cancreatepurchasing,'
						+ 'u1.canviewalerts,'
						+ 'u1.cancreatealerts,'
						+ 'u1.canviewdashboard,'
						+ 'u1.cancreatedashboard,'
						+ 'u1.clients_id clientid,'
						+ 'u1.datecreated,'
						+ 'u1.datemodified,'
						+ 'u2.name usercreated,'
						+ 'u3.name usermodified,'
						+ 'll1.datecreated lastlogindate,'
						+ 'll1.dateexpired lastlogoutdate,'
						+ 'll1.ip lastloginip '
						+ 'from '
						+ 'users u1 left join users u2 on (u1.userscreated_id=u2.id) '
						+ '         left join users u3 on (u1.usersmodified_id=u3.id) '
						+ '         left join getlastlogin(u1.id) ll1 on (1=1) '
						+ 'where '
						+ 'u1.customers_id=$1 '}${
						 clause
						 }and `
						+ 'u1.dateexpired is null '
						+ 'order by '
						+ 'u1.name',
          binds,
          (err, result) => {
            done();

            if (!err) {
              // JS returns date with TZ info/format, need in ISO format...
              result.rows.forEach((u) => {
                if (!__.isUN(u.notes)) u.notes = __.unescapeHTML(u.notes);

                if (!__.isUN(u.datemodified) && !__.isNull(u.datemodified)) u.datemodified = global.moment(u.datemodified).format('YYYY-MM-DD HH:mm:ss');

                if (!__.isUN(u.lastlogindate)) u.lastlogindate = global.moment(u.lastlogindate).format('YYYY-MM-DD HH:mm:ss');

                if (!__.isUN(u.lastlogoutdate)) u.lastlogoutdate = global.moment(u.lastlogoutdate).format('YYYY-MM-DD HH:mm:ss');

                u.datecreated = global.moment(u.datecreated).format('YYYY-MM-DD HH:mm:ss');
              });

              world.spark.emit(world.eventname, {
                rc: global.errcode_none,
                msg: global.text_success,
                fguid: world.fguid,
                rs: result.rows,
                pdata: world.pdata,
              });
            } else {
              msg += `${global.text_generalexception} ${err.message}`;
              global.log.error({ listusers: true }, msg);
              world.spark.emit(global.eventerror, {
                rc: global.errcode_fatal,
                msg,
                pdata: world.pdata,
              });
            }
          },
        );
      } else {
        done();
        global.log.error({ listusers: true }, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {
          rc: global.errcode_dbunavail,
          msg: global.text_nodbconnection,
          pdata: world.pdata,
        });
      }
    },
  );
}

function LoadUser(world) {
  let msg = `[${world.eventname}] `;
  //
  global.pg.connect(
    global.cs,
    (err, client, done) => {
      if (!err) {
        client.query(
          'select '
						+ 'u1.uuid,'
						+ 'u1.name,'
						+ 'u1.email,'
						+ 'u1.uid,'
						+ 'u1.phone,'
						+ 'u1.notes,'
						+ 'u1.isadmin,'
						+ 'u1.isclient,'
						+ 'u1.avatar,'
						+ 'u1.canvieworders,'
						+ 'u1.cancreateorders,'
						+ 'u1.canviewinvoices,'
						+ 'u1.cancreateinvoices,'
						+ 'u1.canviewinventory,'
						+ 'u1.cancreateinventory,'
						+ 'u1.canviewpayroll,'
						+ 'u1.cancreatepayroll,'
						+ 'u1.canviewproducts,'
						+ 'u1.cancreateproducts,'
						+ 'u1.canviewclients,'
						+ 'u1.cancreateclients,'
						+ 'u1.canviewcodes,'
						+ 'u1.cancreatecodes,'
						+ 'u1.canviewusers,'
						+ 'u1.cancreateusers,'
						+ 'u1.canviewbuilds,'
						+ 'u1.cancreatebuilds,'
						+ 'u1.canviewtemplates,'
						+ 'u1.cancreatetemplates,'
						+ 'u1.canviewbanking,'
						+ 'u1.cancreatebanking,'
						+ 'u1.canviewpurchasing,'
						+ 'u1.cancreatepurchasing,'
						+ 'u1.canviewalerts,'
						+ 'u1.cancreatealerts,'
						+ 'u1.canviewdashboard,'
						+ 'u1.cancreatedashboard,'
						+ 'u1.clients_id clientid '
						+ 'from '
						+ 'users u1 left join users u2 on (u1.userscreated_id=u2.id) '
						+ '         left join users u3 on (u1.usersmodified_id=u3.id) '
						+ 'where '
						+ 'u1.customers_id=$1 '
						+ 'and '
						+ 'u1.uuid=$2',
          [world.cn.custid, world.useruuid],
          (err, result) => {
            done();

            if (!err) {
              // JS returns date with TZ info/format, need in ISO format...
              result.rows.forEach((u) => {
                if (!__.isUN(u.notes)) u.notes = __.unescapeHTML(u.notes);
              });

              world.spark.emit(world.eventname, {
                rc: global.errcode_none,
                msg: global.text_success,
                fguid: world.fguid,
                user: result.rows[0],
                pdata: world.pdata,
              });
            } else {
              msg += `${global.text_generalexception} ${err.message}`;
              global.log.error({ loaduser: true }, msg);
              world.spark.emit(global.eventerror, {
                rc: global.errcode_fatal,
                msg,
                pdata: world.pdata,
              });
            }
          },
        );
      } else {
        done();
        global.log.error({ loaduser: true }, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {
          rc: global.errcode_dbunavail,
          msg: global.text_nodbconnection,
          pdata: world.pdata,
        });
      }
    },
  );
}

function ListConnectedUsers(world) {
  const msg = `[${world.eventname}] `;
  //
  global
    .usersLoggedIn()
    .then((users) => {
      world.spark.emit(world.eventname, {
        rc: global.errcode_none,
        msg: global.text_success,
        fguid: world.fguid,
        rs: users,
        pdata: world.pdata,
      });
    })
    .then(null, (err) => {
      world.spark.emit(global.eventerror, {
        rc: global.errcode_nodata,
        msg: global.text_nodata,
        pdata: world.pdata,
      });
    });
}

function SaveUser(world) {
  let msg = `[${world.eventname}] `;
  //
  global.pg.connect(
    global.cs,
    (err, client, done) => {
      if (!err) {
        const tx = new global.pgtx(client);
        tx.begin((err) => {
          if (!err) {
            doCheckUidExists(tx, world)
              .then(ignore => doSaveUser(tx, world))
              .then((result) => {
                tx.commit((err) => {
                  if (!err) {
                    done();
                    world.spark.emit(world.eventname, {
                      rc: global.errcode_none,
                      msg: global.text_success,
                      useruuid: world.userid,
                      datemodified: result.datemodified,
                      usermodified: result.usermodified,
                      pdata: world.pdata,
                    });
                    global.pr.sendToRoomExcept(
                      global.custchannelprefix + world.cn.custid,
                      'usersaved',
                      {
                        useruuid: world.userid,
                        datemodified: result.datemodified,
                        usermodified: result.usermodified,
                      },
                      world.spark.id,
                    );

                    // Find existing entry to update...
                    global.users.get(global.config.redis.prefix + world.useruuid, (
                      err,
                      uuidobj,
                    ) => {
                      if (!err) {
                        global.safejsonparse(uuidobj, (err, uo) => {
                          if (!err) {
                            uo.uid = world.username;
                            uo.isadmin = world.isadmin;
                            uo.isclient = world.isclient;
                            uo.clientid = world.clientid;
                            uo.email = world.email;
                            uo.uname = world.name;

                            global.safejsonstringify(uo, (err, json) => {
                              if (!err) global.users.set(global.config.redis.prefix + world.useruuid, json);
                              else {
                                msg += `${global.text_unablestringifyjson} ${world.uid}`;
                                global.log.error({ saveuser: true }, msg);
                              }
                            });
                          } else {
                            msg += `${global.text_unableparsejson} ${uuidobj}`;
                            global.log.error({ saveuser: true }, msg);
                          }
                        });
                      }
                    });
                  } else {
                    tx.rollback((ignore) => {
                      done();
                      msg += `${global.text_tx} ${err.message}`;
                      global.log.error({ saveuser: true }, msg);
                      world.spark.emit(global.eventerror, {
                        rc: global.errcode_dberr,
                        msg,
                        pdata: world.pdata,
                      });
                    });
                  }
                });
              })
              .then(null, (err) => {
                tx.rollback((ignore) => {
                  done();

                  msg += `${global.text_generalexception} ${err.message}`;
                  global.log.error({ saveuser: true }, msg);
                  world.spark.emit(global.eventerror, {
                    rc: global.errcode_fatal,
                    msg,
                    pdata: world.pdata,
                  });
                });
              });
          } else {
            done();
            msg += `${global.text_notxstart} ${err.message}`;
            global.log.error({ saveuser: true }, msg);
            world.spark.emit(global.eventerror, {
              rc: global.errcode_dberr,
              msg,
              pdata: world.pdata,
            });
          }
        });
      } else {
        done();
        global.log.error({ saveuser: true }, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {
          rc: global.errcode_dbunavail,
          msg: global.text_nodbconnection,
          pdata: world.pdata,
        });
      }
    },
  );
}

function SaveUserPermissions(world) {
  let msg = `[${world.eventname}] `;
  //
  global.pg.connect(
    global.cs,
    (err, client, done) => {
      if (!err) {
        const tx = new global.pgtx(client);
        tx.begin((err) => {
          if (!err) {
            doSaveUserPermissions(tx, world)
              .then((result) => {
                tx.commit((err) => {
                  if (!err) {
                    done();
                    world.spark.emit(world.eventname, {
                      rc: global.errcode_none,
                      msg: global.text_success,
                      pdata: world.pdata,
                    });
                    global.pr.sendToRoom(
                      global.custchannelprefix + world.cn.custid,
                      'userpermissionssaved',
                      { uuid: result.uuid },
                    );
                  } else {
                    tx.rollback((ignore) => {
                      done();
                      msg += `${global.text_tx} ${err.message}`;
                      global.log.error({ saveuserpermissions: true }, msg);
                      world.spark.emit(global.eventerror, {
                        rc: global.errcode_dberr,
                        msg,
                        pdata: world.pdata,
                      });
                    });
                  }
                });
              })
              .then(null, (err) => {
                tx.rollback((ignore) => {
                  done();

                  msg += `${global.text_generalexception} ${err.message}`;
                  global.log.error({ saveuserpermissions: true }, msg);
                  world.spark.emit(global.eventerror, {
                    rc: global.errcode_fatal,
                    msg,
                    pdata: world.pdata,
                  });
                });
              });
          } else {
            done();
            msg += `${global.text_notxstart} ${err.message}`;
            global.log.error({ saveuserpermissions: true }, msg);
            world.spark.emit(global.eventerror, {
              rc: global.errcode_dberr,
              msg,
              pdata: world.pdata,
            });
          }
        });
      } else {
        done();
        global.log.error({ saveuserpermissions: true }, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {
          rc: global.errcode_dbunavail,
          msg: global.text_nodbconnection,
          pdata: world.pdata,
        });
      }
    },
  );
}

function NewUserRoleTemplates(world) {
  global.modhelpers.doSimpleFunc1Tx(world, doNewUserRoleTemplates, (err, result) => {
    if (!err) {
      world.spark.emit(world.eventname, {
        rc: global.errcode_none,
        msg: global.text_success,
        rs: result.rows,
        pdata: world.pdata,
      });
      global.pr.sendToRoomExcept(
        global.custchannelprefix + world.cn.custid,
        'userroletemplatessaved',
        { rs: result.rows },
        world.spark.id,
      );
    }
  });
}

function SaveUserRoleTemplates(world) {
  global.modhelpers.doSimpleFunc1Tx(world, doSaveUserRoleTemplates, (err, result) => {
    if (!err) {
      world.spark.emit(world.eventname, {
        rc: global.errcode_none,
        msg: global.text_success,
        rs: result.rows,
        pdata: world.pdata,
      });
      global.pr.sendToRoomExcept(
        global.custchannelprefix + world.cn.custid,
        'roletemplatessaved',
        { rs: result.rows },
        world.spark.id,
      );
    }
  });
}

function ListUserRoleTemplates(world) {
  global.modhelpers.doSimpleQuery(
    world,
    'SELECT rt1.id, rt1.name, rt1.datecreated, rt1.datemodified, u1.name usercreated, u2.name usermodified, rt1.canvieworders, rt1.cancreateorders, rt1.canviewinvoices, rt1.cancreateinvoices, rt1.canviewinventory, rt1.cancreateinventory, rt1.canviewpayroll, rt1.cancreatepayroll, rt1.canviewproducts, rt1.cancreateproducts, rt1.canviewclients, rt1.cancreateclients, rt1.canviewcodes, rt1.cancreatecodes, rt1.canviewusers, rt1.cancreateusers, rt1.canviewbuilds, rt1.cancreatebuilds, rt1.canviewtemplates, rt1.cancreatetemplates, rt1.canviewbanking, rt1.cancreatebanking, rt1.canviewpurchasing, rt1.cancreatepurchasing, rt1.canviewalerts, rt1.cancreatealerts, rt1.canviewdashboard, rt1.cancreatedashboard '
			+ 'FROM roletemplates rt1 LEFT JOIN users u1 on (rt1.userscreated_id=u1.id) LEFT JOIN users u2 on (rt1.usersmodified_id=u2.id) '
			+ 'WHERE rt1.customers_id=$1 AND rt1.dateexpired IS NULL ',
    [world.cn.custid],
    (err, result) => {
      if (!err) {
        world.spark.emit(world.eventname, {
          rc: global.errcode_none,
          msg: global.text_success,
          fguid: world.fguid,
          rs: result.rows,
          pdata: world.pdata,
        });
      }
    },
  );
}
function ExpireUser(world) {
  let msg = `[${world.eventname}] `;
  //
  global.pg.connect(
    global.cs,
    (err, client, done) => {
      if (!err) {
        const tx = new global.pgtx(client);
        tx.begin((err) => {
          if (!err) {
            doExpireUser(tx, world)
              .then((result) => {
                tx.commit((err) => {
                  if (!err) {
                    done();
                    world.spark.emit(world.eventname, {
                      rc: global.errcode_none,
                      msg: global.text_success,
                      useruuid: world.useruuid,
                      dateexpired: result.dateexpired,
                      userexpired: result.userexpired,
                      pdata: world.pdata,
                    });
                    global.pr.sendToRoomExcept(
                      global.custchannelprefix + world.cn.custid,
                      'userexpired',
                      {
                        useruuid: world.useruuid,
                        dateexpired: result.dateexpired,
                        userexpired: result.userexpired,
                      },
                      world.spark.id,
                    );

                    // Remove user from cache...
                    global.users.del(global.config.redis.prefix + world.useruuid);
                  } else {
                    tx.rollback((ignore) => {
                      done();
                      msg += `${global.text_tx} ${err.message}`;
                      global.log.error({ expireuser: true }, msg);
                      world.spark.emit(global.eventerror, {
                        rc: global.errcode_dberr,
                        msg,
                        pdata: world.pdata,
                      });
                    });
                  }
                });
              })
              .then(null, (err) => {
                tx.rollback((ignore) => {
                  done();

                  msg += `${global.text_generalexception} ${err.message}`;
                  global.log.error({ expireuser: true }, msg);
                  world.spark.emit(global.eventerror, {
                    rc: global.errcode_fatal,
                    msg,
                    pdata: world.pdata,
                  });
                });
              });
          } else {
            done();
            msg += `${global.text_notxstart} ${err.message}`;
            global.log.error({ expireuser: true }, msg);
            world.spark.emit(global.eventerror, {
              rc: global.errcode_dberr,
              msg,
              pdata: world.pdata,
            });
          }
        });
      } else {
        done();
        global.log.error({ expireuser: true }, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {
          rc: global.errcode_dbunavail,
          msg: global.text_nodbconnection,
          pdata: world.pdata,
        });
      }
    },
  );
}

function NewUser(world) {
  let msg = `[${world.eventname}] `;
  //
  global.pg.connect(
    global.cs,
    (err, client, done) => {
      if (!err) {
        const tx = new global.pgtx(client);
        tx.begin((err) => {
          if (!err) {
            doNewUser(tx, world)
              .then((result) => {
                tx.commit((err) => {
                  if (!err) {
                    done();

                    // Add new user to cache...
                    const uo = {
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
                      uuid: result.uuid,
                    };

                    global.safejsonstringify(uo, (err, json) => {
                      if (!err) {
                        global.users.set(global.config.redis.prefix + result.uuid, json);
                      } else {
                        msg += `${global.text_unablestringifyjson} ${world.uid}`;
                        global.log.error({ newuser: true }, msg);
                      }
                    });

                    world.spark.emit(world.eventname, {
                      rc: global.errcode_none,
                      msg: global.text_success,
                      uuid: result.uuid,
                      datecreated: result.datecreated,
                      usercreated: result.usercreated,
                      pdata: world.pdata,
                    });
                    global.pr.sendToRoomExcept(
                      global.custchannelprefix + world.cn.custid,
                      // 'usercreated',
                      'newuser',
                      {
                        uuid: result.uuid,
                        datecreated: result.datecreated,
                        usercreated: result.usercreated,
                      },
                      world.spark.id,
                    );
                  } else {
                    tx.rollback((ignore) => {
                      done();
                      msg += `${global.text_tx} ${err.message}`;
                      global.log.error({ newuser: true }, msg);
                      world.spark.emit(global.eventerror, {
                        rc: global.errcode_dberr,
                        msg,
                        pdata: world.pdata,
                      });
                    });
                  }
                });
              })
              .then(null, (err) => {
                tx.rollback((ignore) => {
                  done();

                  msg += `${global.text_generalexception} ${err.message}`;
                  global.log.error({ newuser: true }, msg);
                  world.spark.emit(global.eventerror, {
                    rc: global.errcode_fatal,
                    msg,
                    pdata: world.pdata,
                  });
                });
              });
          } else {
            done();
            msg += `${global.text_notxstart} ${err.message}`;
            global.log.error({ newuser: true }, msg);
            world.spark.emit(global.eventerror, {
              rc: global.errcode_dberr,
              msg,
              pdata: world.pdata,
            });
          }
        });
      } else {
        done();
        global.log.error({ newuser: true }, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {
          rc: global.errcode_dbunavail,
          msg: global.text_nodbconnection,
          pdata: world.pdata,
        });
      }
    },
  );
}

function ChangePassword(world) {
  let msg = `[${world.eventname}] `;
  //
  global.pg.connect(
    global.cs,
    (err, client, done) => {
      if (!err) {
        const tx = new global.pgtx(client);
        tx.begin((err) => {
          if (!err) {
            doChangePassword(tx, world)
              .then((ignore) => {
                tx.commit((err) => {
                  if (!err) {
                    done();
                    world.spark.emit(world.eventname, {
                      rc: global.errcode_none,
                      msg: global.text_success,
                      useruuid: world.useruuid,
                      pdata: world.pdata,
                    });
                  } else {
                    tx.rollback((ignore) => {
                      done();
                      msg += `${global.text_tx} ${err.message}`;
                      global.log.error({ changepassword: true }, msg);
                      world.spark.emit(global.eventerror, {
                        rc: global.errcode_dberr,
                        msg,
                        pdata: world.pdata,
                      });
                    });
                  }
                });
              })
              .then(null, (err) => {
                tx.rollback((ignore) => {
                  done();

                  msg += `${global.text_generalexception} ${err.message}`;
                  global.log.error({ changepassword: true }, msg);
                  world.spark.emit(global.eventerror, {
                    rc: global.errcode_fatal,
                    msg,
                    pdata: world.pdata,
                  });
                });
              });
          } else {
            done();
            msg += `${global.text_notxstart} ${err.message}`;
            global.log.error({ changepassword: true }, msg);
            world.spark.emit(global.eventerror, {
              rc: global.errcode_dberr,
              msg,
              pdata: world.pdata,
            });
          }
        });
      } else {
        done();
        global.log.error({ changepassword: true }, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {
          rc: global.errcode_dbunavail,
          msg: global.text_nodbconnection,
          pdata: world.pdata,
        });
      }
    },
  );
}

function InitConnectionCache() {
  global.pg.connect(
    global.cs,
    (err, client, done) => {
      if (!err) {
        client.query(
          'select u1.id,u1.customers_id custid,u1.uid,u1.uuid,u1.email,u1.phone,u1.name,u1.isadmin,u1.isclient,clients_id clientid from users u1 where u1.dateexpired is null',
          (err, users) => {
            done();

            if (!err) {
              const expires = global
                .moment()
                .add({ days: 7 })
                .format('YYYY-MM-DD HH:mm:ss');
              users.rows.forEach((user) => {
                if (!__.isNull(user.uuid) && !__.isBlank(user.uuid)) {
                  const channels = user.isadmin
                    ? [
                      global.custchannelprefix + user.custid,
                      global.config.env.notificationschannel,
                      global.config.env.statschannel,
										  ]
                    : [global.custchannelprefix + user.custid];
                  // Try to find existing cache entry, so we can merge some values which may have already been set...
                  global
                    .userFromUid(user.uid)
                    .then((uo) => {
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

                      if (__.isUndefined(uo.channels)) uo.channels = channels;

                      global.safejsonstringify(uo, (err, json) => {
                        if (!err) global.users.set(global.config.redis.prefix + user.uuid, json);
                        else {
                          global.log.error(
                            { initconnectioncache: true },
                            `${global.text_unablestringifyjson  } ${  user.uuid}`,
                          );
                        }
                      });
                    })
                    .then(null, (err) => {
                      const uo = {
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
                        channels,
                        session: null,
                        expires,
                        connectionid: null,
                        uuid: user.uuid,
                      };

                      global.safejsonstringify(uo, (err, json) => {
                        if (!err) global.users.set(global.config.redis.prefix + user.uuid, json);
                        else {
                          global.log.error(
                            { initconnectioncache: true },
                            `${global.text_unablestringifyjson} ${user.uuid}`,
                          );
                        }
                      });
                    });
                }
              });
              global.ConsoleLog('========== InitConnectionCache');
            } else global.log.error({ initconnectioncache: true }, 'Unable to init connections cache');
          },
        );
      } else global.log.error({ initconnectioncache: true }, global.text_nodbconnection);
    },
  );
}

function CheckUserUid(world) {
  let msg = `[${world.eventname}] `;
  //
  global.pg.connect(
    global.cs,
    (err, client, done) => {
      if (!err) {
        const binds = [world.cn.custid, world.uid];
        let clause = '';

        if (!__.isNull(world.useruuid)) {
          clause = ' and u1.uuid!=$3';
          binds.push(world.useruuid);
        }

        client.query(
          `${'select '
						+ 'u1.uuid,'
						+ 'u1.uid,'
						+ 'u1.name '
						+ 'from '
						+ 'users u1 '
						+ 'where '
						+ 'u1.customers_id=$1 '
						+ 'and '
						+ 'u1.dateexpired is null '
						+ 'and '
						+ 'u1.uid=$2'}${
						 clause}`,
          binds,
          (err, result) => {
            done();

            if (!err) {
              world.spark.emit(world.eventname, {
                rc: global.errcode_none,
                msg: global.text_success,
                fguid: world.fguid,
                rs: result.rows,
                pdata: world.pdata,
              });
            } else {
              msg += `${global.text_generalexception} ${err.message}`;
              global.log.error({ checkuseruid: true }, msg);
              world.spark.emit(global.eventerror, {
                rc: global.errcode_fatal,
                msg,
                pdata: world.pdata,
              });
            }
          },
        );
      } else {
        done();
        global.log.error({ checkuseruid: true }, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {
          rc: global.errcode_dbunavail,
          msg: global.text_nodbconnection,
          pdata: world.pdata,
        });
      }
    },
  );
}

function CreateCredentials(uid, pwd) {
  const salt = global.CreatePlainUUID();
  const uuid = global.CreatePlainUUID();
  const sha512 = new global.jssha('SHA-512', 'TEXT');

  sha512.update(pwd + salt);

  console.log(`Salt: ${salt}`);
  console.log(`UUID: ${uuid}`);
  console.log(`Hash: ${sha512.getHash('HEX')}`);
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
