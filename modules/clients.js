// *******************************************************************************************************************************************************************************************
// Internal functions
function existingClientAttachment(args, callback)
{
  // We need user id and customer id to validate request
  // Find user in cache...
  global.users.get
  (
    global.config.redis.prefix + args.uuid,
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
                      'c1.clients_id clientid,' +
                      'c1.name,' +
                      'c1.size ' +
                      'from ' +
                      'clientattachments c1 ' +
                      'where ' +
                      'c1.customers_id=$1 ' +
                      'and ' +
                      'c1.id=$2',
                      [
                        uo.custid,
                        args.clientattachmentid
                      ],
                      function(err, result)
                      {
                        done();

                        if (!err)
                          callback(null, {clientid: result.rows[0].clientid, name: result.rows[0].name, size: result.rows[0].size});
                        else
                        {
                          global.log.error({existingclientattachment: true}, global.text_generalexception + ' ' + err.message);
                          callback(err, null);
                        }
                      }
                    );
                  }
                  else
                  {
                    global.log.error({existingclientattachment: true}, global.text_nodbconnection);
                    callback(err, null);
                  }
                }
              );
            }
            else
              callback(err, null);
          }
        );
      }
      else
        callback(err, null);
    }
  );
}

function newClientAttachment(args, callback)
{
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
              // We need user id and customer id to insert new entry...
              // Find user in cache...
              global.users.get
              (
                global.config.redis.prefix + args.uuid,
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
                          tx.query
                          (
                            'insert into clientattachments (customers_id,clients_id,name,description,mimetype,size,userscreated_id) values ($1,$2,$3,$4,$5,$6,$7) returning id',
                            [
                              uo.custid,
                              args.clientid,
                              args.filename,
                              args.description,
                              args.mimetype,
                              args.size,
                              uo.userid
                            ],
                            function(err, result)
                            {
                              if (!err)
                              {
                                tx.commit
                                (
                                  function(err, ret)
                                  {
                                    if (!err)
                                    {
                                      done();

                                      if (result.rows.length == 1)
                                      {
                                        var clientattachmentid = result.rows[0].id;
                                        //
                                        callback(null, clientattachmentid);
                                        global.pr.sendToRoom(global.custchannelprefix + uo.custid, 'clientattachmentcreated', {clientid: args.clientid, clientattachmentid: clientattachmentid});
                                      }
                                    }
                                    else
                                    {
                                      tx.rollback
                                      (
                                        function(ignore)
                                        {
                                          done();
                                          global.log.error({newclientattachment: true}, global.text_committx + ' ' + err.message);
                                          callback(err, null);
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
                                    global.log.error({newclientattachment: true}, global.text_dbexception + ' ' + err.message);
                                    callback(err, null);
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
                              global.log.error({newclientattachment: true}, global.text_unablegetidfromuuid + ' ' + err.message);
                              callback(err, null);
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
                        global.log.error({newclientattachment: true}, global.text_unablegetidfromuuid + ' ' + err.message);
                        callback(err, null);
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
              global.log.error({newclientattachment: true}, msg);
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({newclientattachment: true}, global.text_nodbconnection);
      }
    }
  );
}

function doNewClient(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'insert into clients (customers_id,clients_id,code,name,url1,email1,contact1,phone1,address1,address2,address3,address4,city,state,postcode,country,contact2,phone2,shipaddress1,shipaddress2,shipaddress3,shipaddress4,shipcity,shipstate,shippostcode,shipcountry,contact3,contact4,mobile3,mobile4,phone3,fax3,bankname,bankbsb,bankaccountno,bankaccountname,dayscredit,linelimit,orderlimit,creditlimit,ordertemplates_id,quotetemplates_id,invoicetemplates_id,labeltemplates_id,isactive,acn,abn,hscode,custcode1,custcode2,issupplier,isclient,userscreated_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52,$53) returning id,datecreated',
        [
          world.cn.custid,
          __.sanitiseAsBigInt(world.parentid),
          __.sanitiseAsString(world.code, 50),
          __.sanitiseAsString(world.name, 50),

          __.sanitiseAsString(world.url1, 100),
          __.sanitiseAsString(world.email1, 100),

          __.sanitiseAsString(world.contact1, 50),
          __.sanitiseAsString(world.phone1, 20),
          __.sanitiseAsString(world.address1, 50),
          __.sanitiseAsString(world.address2, 50),
          __.sanitiseAsString(world.address3, 50),
          __.sanitiseAsString(world.address4, 50),
          __.sanitiseAsString(world.city, 50),
          __.sanitiseAsString(world.state, 50),
          __.sanitiseAsString(world.postcode, 50),
          __.sanitiseAsString(world.country, 50),

          __.sanitiseAsString(world.contact2, 50),
          __.sanitiseAsString(world.phone2, 20),
          __.sanitiseAsString(world.shiptoaddress1, 50),
          __.sanitiseAsString(world.shiptoaddress2, 50),
          __.sanitiseAsString(world.shiptoaddress3, 50),
          __.sanitiseAsString(world.shiptoaddress4, 50),
          __.sanitiseAsString(world.shiptocity, 50),
          __.sanitiseAsString(world.shiptostate, 50),
          __.sanitiseAsString(world.shiptopostcode, 50),
          __.sanitiseAsString(world.shiptocountry, 50),

          __.sanitiseAsString(world.contact3, 50),
          __.sanitiseAsString(world.contact4, 50),
          __.sanitiseAsString(world.mobile3, 20),
          __.sanitiseAsString(world.mobile4, 20),
          __.sanitiseAsString(world.phone3, 20),
          __.sanitiseAsString(world.fax3, 20),

          __.sanitiseAsString(world.bankname, 50),
          __.sanitiseAsString(world.bankbsb, 50),
          __.sanitiseAsString(world.bankaccountno, 50),
          __.sanitiseAsString(world.bankacctname, 50),

          __.notNullNumeric(world.dayscredit, 0),
          __.notNullNumeric(world.linelimit),
          __.notNullNumeric(world.orderlimit),
          __.notNullNumeric(world.creditlimit),

          __.sanitiseAsBigInt(world.ordertemplateid),
          __.sanitiseAsBigInt(world.quotetemplateid),
          __.sanitiseAsBigInt(world.invoicetemplateid),
          __.sanitiseAsBigInt(world.labeltemplateid),

          __.sanitiseAsBool(world.isactive),
          __.sanitiseAsString(world.acn, 20),
          __.sanitiseAsString(world.abn, 20),
          __.sanitiseAsString(world.hscode, 50),
          __.sanitiseAsString(world.custcode1, 50),
          __.sanitiseAsString(world.custcode2, 50),

          __.sanitiseAsBool(world.issupplier),
          __.sanitiseAsBool(world.isclient),

          world.cn.userid
        ],
        function(err, result)
        {
          if (!err)
          {
            var clientid = result.rows[0].id;
            var datecreated = global.moment(result.rows[0].datecreated).format('YYYY-MM-DD HH:mm:ss');

            resolve({clientid: clientid, datecreated: datecreated, usercreated: world.cn.uname});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doSaveClient(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update ' +
        'clients ' +
        'set ' +
        'clients_id=$1,' +
        'name=$2,' +
        'code=$3,' +
        'url1=$4,' +
        'email1=$5,' +

        'contact1=$6,' +
        'phone1=$7,' +
        'address1=$8,' +
        'address2=$9,' +
        'address3=$10,' +
        'address4=$11,' +
        'city=$12,' +
        'state=$13,' +
        'postcode=$14,' +
        'country=$15,' +

        'contact2=$16,' +
        'phone2=$17,' +
        'shipaddress1=$18,' +
        'shipaddress2=$19,' +
        'shipaddress3=$20,' +
        'shipaddress4=$21,' +
        'shipcity=$22,' +
        'shipstate=$23,' +
        'shippostcode=$24,' +
        'shipcountry=$25,' +

        'contact3=$26,' +
        'contact4=$27,' +
        'mobile3=$28,' +
        'mobile4=$29,' +
        'phone3=$30,' +
        'fax3=$31,' +

        'bankname=$32,' +
        'bankbsb=$33,' +
        'bankaccountno=$34,' +
        'bankaccountname=$35,' +
        'dayscredit=$36,' +
        'linelimit=$37,' +
        'orderlimit=$38,' +
        'creditlimit=$39,' +
        'invoicetemplates_id=$40,' +
        'ordertemplates_id=$41,' +
        'quotetemplates_id=$42,' +
        'labeltemplates_id=$43,' +
        'isactive=$44,' +
        'issupplier=$45,' +
        'acn=$46,' +
        'abn=$47,' +
        'hscode=$48,' +
        'custcode1=$49,' +
        'custcode2=$50,' +
        'datemodified=now(),' +
        'usersmodified_id=$51 ' +
        'where ' +
        'customers_id=$52 ' +
        'and ' +
        'id=$53 ' +
        'and ' +
        'dateexpired is null ' +
        'returning ' +
        'datemodified',
        [
          __.sanitiseAsBigInt(world.parentid),
          __.sanitiseAsString(world.name),
          __.sanitiseAsString(world.code),
          __.sanitiseAsString(world.url1),
          __.sanitiseAsString(world.email1),

          __.sanitiseAsString(world.contact1),
          __.sanitiseAsString(world.phone1),
          __.sanitiseAsString(world.address1),
          __.sanitiseAsString(world.address2),
          __.sanitiseAsString(world.address3),
          __.sanitiseAsString(world.address4),
          __.sanitiseAsString(world.city),
          __.sanitiseAsString(world.state),
          __.sanitiseAsString(world.postcode),
          __.sanitiseAsString(world.country),

          __.sanitiseAsString(world.contact2),
          __.sanitiseAsString(world.phone2),
          __.sanitiseAsString(world.shiptoaddress1),
          __.sanitiseAsString(world.shiptoaddress2),
          __.sanitiseAsString(world.shiptoaddress3),
          __.sanitiseAsString(world.shiptoaddress4),
          __.sanitiseAsString(world.shiptocity),
          __.sanitiseAsString(world.shiptostate),
          __.sanitiseAsString(world.shiptopostcode),
          __.sanitiseAsString(world.shiptocountry),

          __.sanitiseAsString(world.contact3),
          __.sanitiseAsString(world.contact4),
          __.sanitiseAsString(world.mobile3),
          __.sanitiseAsString(world.mobile4),
          __.sanitiseAsString(world.phone3),
          __.sanitiseAsString(world.fax3),

          __.sanitiseAsString(world.bankname),
          __.sanitiseAsString(world.bankbsb),
          __.sanitiseAsString(world.bankaccountno),
          __.sanitiseAsString(world.bankaccountname),
          world.dayscredit,
          __.notNullNumeric(world.linelimit),
          __.notNullNumeric(world.orderlimit),
          __.notNullNumeric(world.creditlimit),
          __.sanitiseAsBigInt(world.invoicetemplateid),
          __.sanitiseAsBigInt(world.ordertemplateid),
          __.sanitiseAsBigInt(world.quotetemplateid),
          __.sanitiseAsBigInt(world.labeltemplateid),
          __.sanitiseAsBool(world.isactive),
          __.sanitiseAsBool(world.issupplier),
          __.sanitiseAsString(world.acn),
          __.sanitiseAsString(world.abn),
          __.sanitiseAsString(world.hscode),
          __.sanitiseAsString(world.custcode1),
          __.sanitiseAsString(world.custcode2),
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.clientid)
        ],
        function(err, result)
        {
          if (!err)
          {
            var datemodified = global.moment(result.rows[0].datemodified).format('YYYY-MM-DD HH:mm:ss');

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

function doChangeClientParent(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update clients set clients_id=$1,datemodified=now(),usersmodified_id=$2 where customers_id=$3 and id=$4 returning datemodified',
        [
          __.sanitiseAsBigInt(world.parentid),
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.clientid)
        ],
        function(err, result)
        {
          if (!err)
          {
            var datemodified = global.moment(result.rows[0].datemodified).format('YYYY-MM-DD HH:mm:ss');

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

function doExpireClientStep1(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      if (!world.cascade)
      {
        tx.query
        (
          'select c1.clients_id clientid from clients c1 where c1.customers_id=$1 and c1.id=$2 and c1.dateexpired is null',
          [
            world.cn.custid,
            __.sanitiseAsBigInt(world.clientid)
          ],
          function(err, result)
          {
            if (!err)
            {
              if (result.rows.length == 1)
              {
                var parentid = result.rows[0].clientid;

                tx.query
                (
                  'update clients set clients_id=$1,datemodified=now(),usersmodified_id=$2 where customers_id=$3 and clients_id=$4 and dateexpired is null',
                  [
                    parentid,
                    world.cn.userid,
                    world.cn.custid,
                    __.sanitiseAsBigInt(world.clientid)
                  ],
                  function(err, result)
                  {
                    if (!err)
                      resolve({clientid: world.clientid});
                    else
                      reject(err);
                  }
                );
              }
              else
                reject({message: global.text_unableexpireclient});
            }
            else
              reject(err);
          }
        );
      }
      else
        resolve({clientid: world.clientid});
    }
  );
  return promise;
}

function doExpireClientStep2(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update clients set dateexpired=now(),usersexpired_id=$1 where customers_id=$2 and id=$3 and dateexpired is null returning dateexpired',
        [
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.clientid)
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

function doNewClientNote(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'insert into clientnotes (customers_id,clients_id,userscreated_id) values ($1,$2,$3) returning id,datecreated',
        [
          world.cn.custid,
          __.sanitiseAsBigInt(world.clientid),
          world.cn.userid
        ],
        function(err, result)
        {
          if (!err)
          {
            var clientnoteid = result.rows[0].id;
            var datecreated = global.moment(result.rows[0].datecreated).format('YYYY-MM-DD HH:mm:ss');

            resolve({clientnoteid: clientnoteid, datecreated: datecreated, usercreated: world.cn.uname});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doSaveClientNote(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update clientnotes set notes=$1,datemodified=now(),usersmodified_id=$2 where customers_id=$3 and id=$4 and dateexpired is null returning clients_id,datemodified',
        [
          __.escapeHTML(world.notes),
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.clientnoteid)
        ],
        function(err, result)
        {
          if (!err)
          {
            var clientid = result.rows[0].clients_id;
            var datemodified = global.moment(result.rows[0].datemodified).format('YYYY-MM-DD HH:mm:ss');

            resolve({clientid: clientid, datemodified: datemodified, usermodified: world.cn.uname});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doExpireClientNote(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update clientnotes set dateexpired=now(),usersexpired_id=$1 where customers_id=$2 and id=$3 and dateexpired is null returning clients_id,dateexpired',
        [
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.clientnoteid)
        ],
        function(err, result)
        {
          if (!err)
          {
            var clientid = result.rows[0].clients_id;
            var dateexpired = global.moment(result.rows[0].dateexpired).format('YYYY-MM-DD HH:mm:ss');

            resolve({clientid: clientid, dateexpired: dateexpired, userexpired: world.cn.uname});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doSaveClientAttachment(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update clientattachments set description=$1,datemodified=now(),usersmodified_id=$2 where customers_id=$3 and id=$4 and dateexpired is null returning clients_id,datemodified',
        [
          __.sanitiseAsString(world.description),
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.clientattachmentid)
        ],
        function(err, result)
        {
          if (!err)
          {
            var clientid = result.rows[0].clients_id;
            var datemodified = global.moment(result.rows[0].datemodified).format('YYYY-MM-DD HH:mm:ss');

            resolve({clientid: clientid, datemodified: datemodified, usermodified: world.cn.uname});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doExpireClientAttachment(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update clientattachments set dateexpired=now(),usersexpired_id=$1 where customers_id=$2 and id=$3 and dateexpired is null returning clients_id,dateexpired',
        [
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.clientattachmentid)
        ],
        function(err, result)
        {
          if (!err)
          {
            var clientid = result.rows[0].clients_id;
            var dateexpired = global.moment(result.rows[0].dateexpired).format('YYYY-MM-DD HH:mm:ss');

            resolve({clientid: clientid, dateexpired: dateexpired, userexpired: world.cn.uname});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

// *******************************************************************************************************************************************************************************************
// Public functions
function LoadClient(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'c1.id,' +
    'c1.code,' +
    'c1.name,' +
    'c1.url1,' +
    'c1.email1,' +
    'c1.fax1,' +
    'c1.contact1,' +
    'c1.phone1,' +
    'c1.address1,' +
    'c1.address2,' +
    'c1.address3,' +
    'c1.address4,' +
    'c1.city,' +
    'c1.state,' +
    'c1.postcode,' +
    'c1.country,' +
    'c1.contact2,' +
    'c1.phone2,' +
    'c1.shipaddress1,' +
    'c1.shipaddress2,' +
    'c1.shipaddress3,' +
    'c1.shipaddress4,' +
    'c1.shipcity,' +
    'c1.shipstate,' +
    'c1.shippostcode,' +
    'c1.shipcountry,' +
    'c1.contact3,' +
    'c1.contact4,' +
    'c1.mobile3,' +
    'c1.mobile4,' +
    'c1.phone3,' +
    'c1.fax3,' +
    'c1.bankname,' +
    'c1.bankbsb,' +
    'c1.bankaccountno,' +
    'c1.bankaccountname,' +
    'c1.issupplier,' +
    'c1.dayscredit,' +
    'c1.orderlimit,' +
    'c1.creditlimit,' +
    'c1.invoicetemplates_id invoicetemplateid,' +
    'c1.ordertemplates_id ordertemplateid,' +
    'c1.quotetemplates_id quotetemplateid,' +
    'c1.deliverydockettemplates_id deliverydockettemplateid,' +
    'c1.labeltemplates_id labeltemplateid,' +
    'c1.isactive,' +
    'c1.acn,' +
    'c1.abn,' +
    'c1.hscode,' +
    'c1.custcode1,' +
    'c1.custcode2,' +
    'c1.datecreated,' +
    'c1.datemodified,' +
    'c2.id parentid,' +
    'c2.code parentcode,' +
    'c2.name parentname,' +
    'u1.name usercreated,' +
    'u2.name usermodified ' +
    'from ' +
    'clients c1 left join clients c2 on (c1.clients_id=c2.id) ' +
    '           left join users u1 on (c1.userscreated_id=u1.id) ' +
    '           left join users u2 on (c1.usersmodified_id=u2.id) ' +
    'where ' +
    'c1.customers_id=$1 ' +
    'and ' +
    'c1.id=$2',
    [
      world.cn.custid,
      __.sanitiseAsBigInt(world.clientid)
    ],
    function(err, result)
    {
      if (!err)
      {
        global.modhelpers.doTransformFields(result.rows);
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, client: result.rows[0], pdata: world.pdata});
      }
    }
  );
}

function ListClients(world)
{
  var clause = '';

  if (!__.isUNB(world.showinactive))
  {
    if (world.showinactive)
      clause = 'and c1.isactive=0 ';
    else
      clause = 'and c1.isactive=1 ';
  }

  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'c1.id,' +
    'c1.code,' +
    'c1.name,' +
    'c1.issupplier,' +
    'c1.isactive,' +
    'c1.datecreated,' +
    'c1.datemodified,' +
    'c2.id parentid,' +
    'c2.code parentcode,' +
    'c2.name parentname,' +
    'u1.name usercreated,' +
    'u2.name usermodified ' +
    'from ' +
    'clients c1 left join clients c2 on (c1.clients_id=c2.id) ' +
    '           left join users u1 on (c1.userscreated_id=u1.id) ' +
    '           left join users u2 on (c1.usersmodified_id=u2.id) ' +
    'where ' +
    'c1.customers_id=$1 ' +
    clause +
    'and ' +
    'c1.isclient=1 ' +
    'and ' +
    'c1.dateexpired is null ' +
    'order by ' +
    'c1.path,' +
    'c2.id desc,' +
    'c1.name',
    [
      world.cn.custid
    ],
    function(err, result)
    {
      if (!err)
      {
        global.modhelpers.doTransformFields(result.rows);
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
      }
    }
  );
}

function NewClient(world)
{
  global.modhelpers.doSimpleFunc2Tx
  (
    world,
    global.modconfig.doNextClientNo,
    doNewClient,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, clientid: world.clientid, datecreated: result.datecreated, usercreated: result.usercreated, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'superfundcreated', {clientid: world.clientid, datecreated: result.datecreated, usercreated: result.usercreated}, world.spark.id);
        global.pr.sendToRoom(global.custchannelprefix + world.cn.custid, 'configsaved', {});
      }
    },
    function(f1result)
    {
      world.code = f1result.clientno;
    }
  );
}

function SaveClient(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doSaveClient,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, clientid: world.clientid, datemodified: result.datemodified, usermodified: result.usermodified, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'clientsaved', {clientid: world.clientid, datemodified: result.datemodified, usermodified: result.usermodified}, world.spark.id);
      }
    }
  );
}

function ChangeClientParent(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doChangeClientParent,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, clientid: world.clientid, parentid: world.parentid, datemodified: result.datemodified, usermodified: result.usermodified, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'clientparentchanged', {clientid: world.clientid, parentid: world.parentid, datemodified: result.datemodified, usermodified: result.usermodified}, world.spark.id);
      }
    }
  );
}

function ExpireClient(world)
{
  global.modhelpers.doSimpleFunc2Tx
  (
    world,
    doExpireClientStep1,
    doExpireClientStep2,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, clientid: world.clientid, dateexpired: result.dateexpired, userexpired: result.userexpired, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'clientexpired', {clientid: world.clientid, dateexpired: result.dateexpired, userexpired: result.userexpired}, world.spark.id);
      }
    }
  );
}

function ListAllEmails(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'c1.email1 email,' +
    'c1.name ' +
    'from ' +
    'clients c1 ' +
    'where ' +
    'c1.email1 is not null ' +
    'and ' +
    'c1.customers_id=$1 ' +
    'and ' +
    'c1.email1!=\'\' ' +
    'and ' +
    'c1.dateexpired is null ' +
    'union ' +
    'select ' +
    'c2.email2 email,' +
    'c2.name ' +
    'from ' +
    'clients c2 ' +
    'where ' +
    'c2.email2 is not null ' +
    'and ' +
    'c2.customers_id=$2 ' +
    'and ' +
    'c2.email2!=\'\' ' +
    'and ' +
    'c2.dateexpired is null ' +
    'order by ' +
    'name,' +
    'email',
    [
      world.cn.custid,
      world.cn.custid
    ],
    function(err, result)
    {
      if (!err)
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
    }
  );
}

function ListEmails(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'c1.email1,' +
    'c1.email2,' +
    'c1.contact1,' +
    'c1.contact2 ' +
    'from ' +
    'clients c1 ' +
    'where ' +
    'c1.customers_id=$1 ' +
    'and ' +
    'c1.id=$2',
    [
      world.cn.custid,
      world.clientid
    ],
    function(err, result)
    {
      if (!err)
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
    }
  );
}

function ListClientNotes(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'cn1.id,' +
    'cn1.notes,' +
    'cn1.datecreated,' +
    'cn1.datemodified,' +
    'u1.name usercreated,' +
    'u2.name usermodified ' +
    'from ' +
    'clientnotes cn1 left join users u1 on (cn1.userscreated_id=u1.id) ' +
    '                left join users u2 on (cn1.usersmodified_id=u2.id) ' +
    'where ' +
    'cn1.customers_id=$1 ' +
    'and ' +
    'cn1.clients_id=$2 ' +
    'and ' +
    'cn1.dateexpired is null ' +
    'order by ' +
    'cn1.datecreated desc',
    [
      world.cn.custid,
      __.sanitiseAsBigInt(world.clientid)
    ],
    function(err, result)
    {
      if (!err)
      {
        global.modhelpers.doTransformFields(result.rows);
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
      }
    }
  );
}

function NewClientNote(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doNewClientNote,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, clientid: world.clientid, clientnoteid: result.clientnoteid, datecreated: result.datecreated, usercreated: result.usercreated, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'superfundcreated', {clientid: world.clientid, clientnoteid: result.clientnoteid, datecreated: result.datecreated, usercreated: result.usercreated}, world.spark.id);
      }
    }
  );
}

function SaveClientNote(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doSaveClientNote,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, clientid: result.clientid, clientnoteid: world.clientnoteid, datemodified: result.datemodified, usermodified: result.usermodified, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'clientnotesaved', {clientid: result.clientid, clientnoteid: world.clientnoteid, datemodified: result.datemodified, usermodified: result.usermodified}, world.spark.id);
      }
    }
  );
}

function ListClientAttachments(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'ca1.id,' +
    'ca1.name,' +
    'ca1.description,' +
    'ca1.mimetype,' +
    'ca1.size,' +
    'ca1.datecreated,' +
    'ca1.datemodified,' +
    'u1.name usercreated,' +
    'u2.name usermodified ' +
    'from ' +
    'clientattachments ca1 left join users u1 on (ca1.userscreated_id=u1.id) ' +
    '                      left join users u2 on (ca1.usersmodified_id=u2.id) ' +
    'where ' +
    'ca1.customers_id=$1 ' +
    'and ' +
    'ca1.clients_id=$2 ' +
    'and ' +
    'ca1.dateexpired is null ' +
    'order by ' +
    'ca1.datecreated desc',
    [
      world.cn.custid,
      __.sanitiseAsBigInt(world.clientid)
    ],
    function(err, result)
    {
      if (!err)
      {
        global.modhelpers.doTransformFields(result.rows);

        result.rows.forEach
        (
          function(p)
          {
            if (global.isMimeTypeImage(p.mimetype))
            p.image = global.config.folders.clientattachments + p.id + '_' + world.clientid + '_' + p.name;
          }
        );

        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
      }
    }
  );
}

function SaveClientAttachment(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doSaveClientAttachment,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, clientid: result.clientid, clientattachmentid: world.clientattachmentid, dateexpired: result.dateexpired, userexpired: result.userexpired, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'clientattachmentsaved', {clientid: result.clientid, clientattachmentid: world.clientattachmentid, dateexpired: result.dateexpired, userexpired: result.userexpired}, world.spark.id);
      }
    }
  );
}

function ExpireClientAttachment(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doExpireClientAttachment,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, clientattachmentid: world.clientattachmentid, clientid: result.clientid, dateexpired: result.dateexpired, userexpired: result.userexpired, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'clientattachmentexpired', {clientattachmentid: world.clientattachmentid, clientid: result.clientid, dateexpired: result.dateexpired, userexpired: result.userexpired}, world.spark.id);
      }
    }
  );
}

function CheckClientCode(world)
{
  var binds = [world.cn.custid, world.code];
  var clause = '';

  if (!__.isNull(world.clientid))
  {
    clause = ' and c1.id!=$3';
    binds.push(world.clientid);
  }

  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'c1.id,' +
    'c1.code,' +
    'c1.name ' +
    'from ' +
    'clients c1 ' +
    'where ' +
    'c1.customers_id=$1 ' +
    'and ' +
    'c1.dateexpired is null ' +
    'and ' +
    'upper(c1.code)=upper($2)' +
    clause,
    binds,
    function(err, result)
    {
      if (!err)
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
    }
  );
}

function SearchClientNote(world)
{
  var words =  world.words.replace(/\s+/g, ' & ');

  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'cn1.id,' +
    'cn1.notes,' +
    'cn1.datecreated,' +
    'cn1.datemodified,' +
    'u1.name usercreated,' +
    'u2.name usermodified ' +
    'from ' +
    'clientnotes cn1 left join users u1 on (cn1.userscreated_id=u1.id) ' +
    '                left join users u2 on (cn1.usersmodified_id=u2.id) ' +
    'where ' +
    'cn1.customers_id=$1 ' +
    'and ' +
    'cn1.clients_id=$2 ' +
    'and ' +
    'cn1.dateexpired is null ' +
    'and ' +
    'to_tsvector(\'english\', cn1.notes) @@ to_tsquery(\'english\', $3) ' +
    'order by ' +
    'cn1.datecreated desc',
    [
      world.cn.custid,
      __.sanitiseAsBigInt(world.clientid),
      __.sanitiseAsString(words)
    ],
    function(err, result)
    {
      if (!err)
      {
        global.modhelpers.doTransformFields(result.rows);
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
      }
    }
  );
}

function SearchClients(world)
{
  global.modhelpers.doBuildSearchWhereClause
  (
    [world.cn.custid],
    ['c1.code', 'c1.name', 'c1.email1', 'c1.phone1', 'c1.contact1'],
    [world.code, world.name, world.email, world.phone, world.comtact],
    'c1.datecreated',
    world.datefrom,
    world.dateto,
    null,
    null,
    world.maxhistory,
    function(binds, bindno, clauses)
    {
      global.modhelpers.doSimpleQuery
      (
        world,
        'select ' +
        'c1.id,' +
        'c1.code,' +
        'c1.name,' +
        'c1.issupplier,' +
        'c1.isactive,' +
        'c1.datecreated,' +
        'c1.datemodified,' +
        'c2.id parentid,' +
        'c2.code parentcode,' +
        'c2.name parentname,' +
        'u1.name usercreated,' +
        'u2.name usermodified ' +
        'from ' +
        'clients c1 left join clients c2 on (c1.clients_id=c2.id) ' +
        '           left join users u1 on (c1.userscreated_id=u1.id) ' +
        '           left join users u2 on (c1.usersmodified_id=u2.id) ' +
        'where ' +
        'c1.customers_id=$1 ' +
        'and ' +
        clauses +
        'c1.dateexpired is null ' +
        'order by ' +
        'c1.path,' +
        'c2.id desc,' +
        'c1.name ' +
        'limit $' + bindno,
        binds,
        function(err, result)
        {
          if (!err)
          {
            global.modhelpers.doTransformFields(result.rows);
            world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
          }
        }
      );
    }
  );
}

function ExpireClientNote(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doExpireClientNote,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, clientnoteid: world.clientnoteid, clientid: result.clientid, dateexpired: result.dateexpired, userexpired: result.userexpired, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'clientnoteexpired', {clientnoteid: world.clientnoteid, clientid: result.clientid, dateexpired: result.dateexpired, userexpired: result.userexpired}, world.spark.id);
      }
    }
  );
}

// *******************************************************************************************************************************************************************************************
// Internal functions
module.exports.doNewClient = doNewClient;
module.exports.newClientAttachment = newClientAttachment;
module.exports.existingClientAttachment = existingClientAttachment;

// *******************************************************************************************************************************************************************************************
// Public functions
module.exports.LoadClient = LoadClient;
module.exports.ListClients = ListClients;
module.exports.NewClient = NewClient;
module.exports.SaveClient = SaveClient;
module.exports.ChangeClientParent = ChangeClientParent;
module.exports.ExpireClient = ExpireClient;
module.exports.ListAllEmails = ListAllEmails;
module.exports.ListEmails = ListEmails;
module.exports.CheckClientCode = CheckClientCode;
module.exports.SearchClients = SearchClients;

module.exports.ListClientNotes = ListClientNotes;
module.exports.NewClientNote = NewClientNote;
module.exports.SaveClientNote = SaveClientNote;
module.exports.ExpireClientNote = ExpireClientNote;
module.exports.SearchClientNote = SearchClientNote;

module.exports.ListClientAttachments = ListClientAttachments;
module.exports.SaveClientAttachment = SaveClientAttachment;
module.exports.ExpireClientAttachment = ExpireClientAttachment;

