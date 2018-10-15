// *******************************************************************************************************************************************************************************************
// Internal functions
function doLogMsg(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      // Send to everyone including myself...
      if (__.isUndefined(world.recipients) || (world.recipients.length == 0))
      {
        tx.query
        (
          'insert into ' +
          'ims ' +
          '(' +
          'customers_id,' +
          'users_id,' +
          'msg,' +
          'itype,' +
          'userscreated_id' +
          ') ' +
          'select ' +
          '$1,' +
          'u1.id,' +
          '$2,' +
          '$3,' +
          '$4 ' +
          'from ' +
          'users u1 ' +
          'where ' +
          'u1.dateexpired is null',
          [
            world.cn.custid,
            __.sanitiseAsComment(world.msg),
            global.itype_ims_chat,
            world.cn.userid
          ],
          function(err, rows)
          {
            if (!err)
              resolve(undefined);
            else
              reject(err);
          }
        );
      }
      else
      {
        var recipients = global.StringArrayToString(world.recipients);

        // Send to one or more recipients, including myself...
        tx.query
        (
          'insert into ' +
          'ims ' +
          '(' +
          'customers_id,' +
          'users_id,' +
          'msg,' +
          'itype,' +
          'userscreated_id' +
          ') ' +
          'select ' +
          '$1,' +
          'u1.id,' +
          '$2,' +
          '$3,' +
          '$4 ' +
          'from ' +
          'users u1 ' +
          'where ' +
          'uuid in ' +
          '(' +
          recipients +
          ') ' +
          'or ' +
          'u1.id=$5',
          [
            world.cn.custid,
            __.sanitiseAsComment(world.msg),
            global.itype_ims_chat,
            world.cn.userid,
            world.cn.userid
          ]
          ,
          function(err, result)
          {
            if (!err)
              resolve(undefined);
            else
              reject(err);
          }
        );
      }
    }
  );
  return promise;
}

// *******************************************************************************************************************************************************************************************
// Public functions
function ChatMsg(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doLogMsg,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, pdata: world.pdata});
        global.pr.sendToRoom(global.custchannelprefix + world.cn.custid, 'newchatmsg', {});
      }
    }
  );
}

function ListChatsForMe(world)
{
  var maxhistory = __.isUN(maxhistory) ? global.config.defaults.defaultmaxhistory : maxhistory;

  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'i1.id,' +
    'i1.msg,' +
    'i1.datecreated,' +
    'u1.uuid senderuuid,' +
    'u1.name sendername,' +
    'u2.uuid recipientuuid,' +
    'u2.name recipientname ' +
    'from ' +
    'ims i1 left join users u1 on (i1.userscreated_id=u1.id) ' +
    '       left join users u2 on (i1.users_id=u2.id) ' +
    'where ' +
    'i1.customers_id=$1' +
    'and ' +
    '(' +
    'i1.users_id=$2 ' +
    'or ' +
    'i1.userscreated_id=$3 ' +
    ') ' +
    'and ' +
    'i1.userscreated_id!=i1.users_id ' +
    'order by ' +
    'i1.datecreated desc ' +
    'limit $4',
    [
      world.cn.custid,
      world.cn.userid,
      world.cn.userid,
      maxhistory
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

function ListAlertsForMe(world)
{
  var maxhistory = __.isUN(maxhistory) ? global.config.defaults.defaultmaxhistory : maxhistory;

  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'a1.id,' +
    'a1.orderno,' +
    'a1.status,' +
    'a1.datecreated,' +
    'u1.name usercreated ' +
    'from ' +
    'alerts a1 left join users u1 on (a1.userscreated_id=u1.id) ' +
    'where ' +
    'a1.customers_id=$1' +
    'and ' +
    'a1.users_id=$2 ' +
    'order by ' +
    'a1.datecreated desc ' +
    'limit $3',
    [
      world.cn.custid,
      world.cn.userid,
      maxhistory
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

function EmailHistory(world)
{
  var maxhistory = __.isUN(maxhistory) ? global.config.defaults.defaultmaxhistory : maxhistory;

  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'e1.id,' +
    'o1.orderno,' +
    'e1.copyno,' +
    'e1.recipients,' +
    'e1.subject,' +
    'e1.orders_id orderid,' +
    'e1.datesent,' +
    'e1.datecreated,' +
    'u1.name usercreated ' +
    'from ' +
    'emails e1 left join orders o1 on (e1.orders_id=o1.id) ' +
    '          left join users u1 on (e1.userscreated_id=u1.id) ' +
    'where ' +
    'e1.customers_id=$1 ' +
    'order by ' +
    'u1.name,' +
    'e1.id desc ' +
    'limit $2',
    [
      world.cn.custid,
      maxhistory
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

function EmailFeedback(world)
{
  var msg = '[' + world.eventname + '] ';
  var transporter = createSMTPTransport();

  transporter.sendMail
  (
    {
      from: global.config.smtp.returnmail,
      to: global.config.env.feedbackemail,
      subject: 'Big Accounting Feedback',
      html: world.comments
    },
    function(err, info)
    {
      if (!err)
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, pdata: world.pdata});
      else
      {
        msg += global.text_unableemail + err.message;
        global.log.error({emailfeedback: true}, global.text_unableemail);
        world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
      }
    }
  );
}

// *******************************************************************************************************************************************************************************************
// Public functions
module.exports.ChatMsg = ChatMsg;
module.exports.ListChatsForMe = ListChatsForMe;
module.exports.ListAlertsForMe = ListAlertsForMe;

module.exports.EmailHistory = EmailHistory;
module.exports.EmailFeedback = EmailFeedback;
