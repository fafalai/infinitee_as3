// *******************************************************************************************************************************************************************************************
// Internal functions
function doNewStatusAlert(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      // Default to create alert for "self" so we don't have null users_id...
      tx.query
      (
        'insert into orderstatusalerts (customers_id,users_id,status,email,mobile,userscreated_id) values ($1,$2,$3,$4,$5,$6) returning id,datecreated',
        [
          world.cn.custid,
          __.sanitiseAsString(world.userid),
          world.statusalertid,
          __.sanitiseAsString(world.email),
            __.sanitiseAsString(world.mobile),
          world.cn.userid
        ],
        function(err, result)
        {
          if (!err)
          {
            var statusalertid = result.rows[0].id;
            var datecreated = global.moment(result.rows[0].datecreated).format('YYYY-MM-DD HH:mm:ss');

            resolve({statusalertid: statusalertid, datecreated: datecreated, usercreated: world.cn.uname});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doSaveStatusAlert(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update orderstatusalerts set users_id=$1,status=$2,email=$3,mobile=$4,datemodified=now(),usersmodified_id=$5 where customers_id=$6 and id=$7 and dateexpired is null returning datemodified',
        [
          __.sanitiseAsBigInt(world.userid),
          __.sanitiseAsBigInt(world.statusalertid),
          __.sanitiseAsString(world.email),
          __.sanitiseAsString(world.mobile),
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.orderstatusalertid)
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

function doExpireStatusAlert(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update orderstatusalerts set dateexpired=now(),usersexpired_id=$1 where customers_id=$2 and id=$3 and dateexpired is null returning dateexpired',
        [
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.statusalertid)
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

// *******************************************************************************************************************************************************************************************
// Public functions
function ListStatusAlerts(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'a1.id,' +
    'a1.status,' +
    'a1.email,' +
    'a1.mobile,' +
    'a1.datecreated,' +
    'a1.datemodified,' +
    'u1.uuid uuid,' +
    'u1.name username,' +
    'u2.name usercreated,' +
    'u3.name usermodified ' +
    'from ' +
    'orderstatusalerts a1 left join users u1 on (a1.users_id=u1.id) ' +
    '                     left join users u2 on (a1.userscreated_id=u2.id) ' +
    '                     left join users u3 on (a1.usersmodified_id=u3.id) ' +
    'where ' +
    'a1.customers_id=$1 ' +
    'and ' +
    'a1.dateexpired is null ' +
    'order by ' +
    'a1.status,' +
    'u1.name',
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

function LoadStatusAlert(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'a1.id,' +
    'a1.status,' +
    'a1.email,' +
    'a1.mobile,' +
    'u1.uuid uuid ' +
    'from ' +
    'orderstatusalerts a1 left join users u1 on (a1.users_id=u1.id) ' +
    'where ' +
    'a1.customers_id=$1 ' +
    'and ' +
    'a1.id=$2',
    [
      world.cn.custid,
      __.sanitiseAsBigInt(world.orderstatusalertid)
    ],
    function(err, result)
    {
      if (!err)
      {
        global.modhelpers.doTransformFields(result.rows);
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, statusalert: result.rows[0], pdata: world.pdata});
      }
    }
  );
}

function NewStatusAlert(world)
{
  global.getUserObjFromUUID
  (
    world, world.useruuid,
    function(err, result)
    {
      if (!err)
      {
        world.userid = result.userid;

        global.modhelpers.doSimpleFunc1Tx
        (
          world,
          doNewStatusAlert,
          function(err, result)
          {
            if (!err)
            {
              world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, statusalertid: world.statusalertid, datecreated: result.datecreated, usercreated: result.usercreated, pdata: world.pdata});
              global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'statusalertcreated', {statusalertid: world.statusalertid, datecreated: result.datecreated, usercreated: result.usercreated}, world.spark.id);
            }
          }
        );
      }
    }
  );
}

function SaveStatusAlert(world)
{
  global.getUserObjFromUUID
  (
    world, world.useruuid,
    function(err, result)
    {
      if (!err)
      {
        world.userid = result.userid;

        global.modhelpers.doSimpleFunc1Tx
        (
          world,
          doSaveStatusAlert,
          function(err, result)
          {
            if (!err)
            {
              world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, statusalertid: world.statusalertid, datemodified: result.datemodified, usermodified: result.usermodified, pdata: world.pdata});
              global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'statusalertsaved', {statusalertid: world.statusalertid, datemodified: result.datemodified, usermodified: result.usermodified}, world.spark.id);
            }
          }
        );
      }
    }
  );
}

function ExpireStatusAlert(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doExpireStatusAlert,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, statusalertid: world.statusalertid, dateexpired: result.dateexpired, userexpired: result.userexpired, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'statusalertexpired', {statusalertid: world.statusalertid, dateexpired: result.dateexpired, userexpired: result.userexpired}, world.spark.id);
      }
    }
  );
}

// *******************************************************************************************************************************************************************************************
// Public functions
module.exports.ListStatusAlerts = ListStatusAlerts;
module.exports.LoadStatusAlert = LoadStatusAlert;
module.exports.NewStatusAlert = NewStatusAlert;
module.exports.SaveStatusAlert = SaveStatusAlert;
module.exports.ExpireStatusAlert = ExpireStatusAlert;
