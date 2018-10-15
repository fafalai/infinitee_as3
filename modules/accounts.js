// *******************************************************************************************************************************************************************************************
// Internal functions
function doFindTaxCode(tx, custid, code)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      if (__.isBlank(code) || __.isNull(code))
        resolve(null);
      else
      {
        tx.query
        (
          'select tc1.id from taxcodes tc1 where tc1.customers_id=$1 and upper(tc1.code)=upper($2) and tc1.dateexpired is null',
          [
            custid,
            __.sanitiseAsString(code)
          ],
          function(err, result)
          {
            if (!err)
            {
              if (result.rows.length == 0)
                resolve(null);
              else
              {
                var taxcodeid = result.rows[0].id;

                resolve(taxcodeid);
              }
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

function doFindAccountCode(tx, custid, code)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      if (__.isBlank(code) || __.isNull(code))
        resolve(null);
      else
      {
        tx.query
        (
          'select a1.id from accounts a1 where a1.customers_id=$1 and upper(a1.code)=upper($2) and a1.dateexpired is null',
          [
            custid,
            __.sanitiseAsString(code)
          ],
          function(err, result)
          {
            if (!err)
            {
              if (result.rows.length == 0)
                resolve(null);
              else
              {
                var accountid = result.rows[0].id;

                resolve(accountid);
              }
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

function doFindSuperfund(tx, custid, name)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      if (__.isBlank(name) || __.isNull(name))
        resolve(null);
      else
      {
        tx.query
        (
          'select s1.id from superfunds s1 where s1.customers_id=$1 and upper(s1.name)=upper($2) and s1.dateexpired is null',
          [
            custid,
            __.sanitiseAsString(name)
          ],
          function(err, result)
          {
            if (!err)
            {
              if (result.rows.length == 0)
                resolve(null);
              else
              {
                var superfundid = result.rows[0].id;

                resolve(superfundid);
              }
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

function doNewSuperfund(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'insert into superfunds (customers_id,name,userscreated_id) values ($1,$2,$3) returning id,datecreated',
        [
          world.cn.custid,
          __.sanitiseAsString(world.name, 50),
          world.cn.userid
        ],
        function(err, result)
        {
          if (!err)
          {
            var superfundid = result.rows[0].id;
            var datecreated = global.moment(result.rows[0].datecreated).format('YYYY-MM-DD HH:mm:ss');

            resolve({superfundid: superfundid, datecreated: datecreated, usercreated: world.cn.uname});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doSaveSuperfund(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update superfunds set name=$1,datemodified=now(),usersmodified_id=$2 where customers_id=$3 and id=$4 returning datemodified',
        [
          __.sanitiseAsString(world.name, 50),
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.superfundid)
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

function doExpireSuperfund(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update superfunds set dateexpired=now(),usersexpired_id=$1 where customers_id=$2 and id=$3 and dateexpired is null returning dateexpired',
        [
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.superfundid)
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

function doNewTaxCode(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'insert into taxcodes (customers_id,code,name,percentage,userscreated_id) values ($1,$2,$3,$4,$5) returning id,datecreated',
        [
          world.cn.custid,
          __.sanitiseAsString(world.code, 50),
          __.sanitiseAsString(world.name, 50),
          __.sanitiseAsPrice(world.percent, 4),
          world.cn.userid
        ],
        function(err, result)
        {
          if (!err)
          {
            var taxcodeid = result.rows[0].id;
            var datecreated = global.moment(result.rows[0].datecreated).format('YYYY-MM-DD HH:mm:ss');

            resolve({taxcodeid: taxcodeid, datecreated: datecreated, usercreated: world.cn.uname});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doSaveTaxCode(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update taxcodes set code=$1,name=$2,percentage=$3,datemodified=now(),usersmodified_id=$4 where customers_id=$5 and id=$6 returning datemodified',
        [
          __.sanitiseAsString(world.code, 50),
          __.sanitiseAsString(world.name, 50),
          __.notNullNumeric(world.percent, 4),
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.taxcodeid)
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

function doExpireTaxCode(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update taxcodes set dateexpired=now(),usersexpired_id=$1 where customers_id=$2 and id=$3 and dateexpired is null returning dateexpired',
        [
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.taxcodeid)
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

function doNewAccount(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'insert into accounts (customers_id,accounts_id,code,name,itype,userscreated_id) values ($1,$2,$3,$4,$5,$6) returning id,datecreated',
        [
          world.cn.custid,
          __.sanitiseAsBigInt(world.parentid),
          __.sanitiseAsString(world.code, 50),
          __.sanitiseAsString(world.name, 50),
          world.accounttype,
          world.cn.userid
        ],
        function(err, result)
        {
          if (!err)
          {
            var accountid = result.rows[0].id;
            var datecreated = global.moment(result.rows[0].datecreated).format('YYYY-MM-DD HH:mm:ss');

            resolve({accountid: accountid, datecreated: datecreated, usercreated: world.cn.uname});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doSaveAccount(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update accounts set code=$1,name=$2,altcode=$3,altname=$4,itype=$5,datemodified=now(),usersmodified_id=$6 where customers_id=$7 and id=$8 returning datemodified',
        [
          __.sanitiseAsString(world.code, 50),
          __.sanitiseAsString(world.name, 50),
          __.sanitiseAsString(world.altcode, 50),
          __.sanitiseAsString(world.altname, 50),
          world.accounttype,
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.accountid)
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

function doChangeAccountParent(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update accounts set accounts_id=$1,datemodified=now(),usersmodified_id=$2 where customers_id=$3 and id=$4 returning datemodified',
        [
          __.sanitiseAsBigInt(world.parentid),
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.accountid)
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

function doExpireAccountStep1(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      if (!world.cascade)
      {
        tx.query
        (
          'select a1.accounts_id accountid from accounts a1 where a1.customers_id=$1 and a1.id=$2 and a1.dateexpired is null',
          [
            world.cn.custid,
            __.sanitiseAsBigInt(world.accountid)
          ],
          function(err, result)
          {
            if (!err)
            {
              if (result.rows.length == 1)
              {
                var parentid = result.rows[0].accountid;

                tx.query
                (
                  'update accounts set accounts_id=$1,datemodified=now(),usersmodified_id=$2 where customers_id=$3 and accounts_id=$4 and dateexpired is null',
                  [
                    parentid,
                    world.cn.userid,
                    world.cn.custid,
                    __.sanitiseAsBigInt(world.accountid)
                  ],
                  function(err, result)
                  {
                    if (!err)
                      resolve({accountid: world.accountid});
                    else
                      reject(err);
                  }
                );
              }
              else
                reject({message: global.text_unableexpireaccount});
            }
            else
              reject(err);
          }
        );
      }
      else
        resolve({accountid: world.accountid});
    }
  );
  return promise;
}

function doExpireAccountStep2(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update accounts set dateexpired=now(),usersexpired_id=$1 where customers_id=$2 and id=$3 and dateexpired is null returning dateexpired',
        [
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.accountid)
        ],
        function(err, result)
        {
          if (!err)
          {
            var dateexpired = global.moment(result.rows[0].dateexpired).format('YYYY-MM-DD HH:mm:ss');

            resolve({dateexpired: dateexpired, userexpired:world.cn.uname});
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
function ListAccounts(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'a1.id,' +
    'a1.code,' +
    'a1.name,' +
    'a1.altcode,' +
    'a1.altname,' +
    'a1.itype,' +
    'a1.notes,' +
    'a1.datecreated,' +
    'a1.datemodified,' +
    'a2.id parentid,' +
    'a2.code parentcode,' +
    'a2.name parentname,' +
    'a2.itype parentitype,' +
    'u1.name usercreated,' +
    'u2.name usermodified ' +
    'from ' +
    'accounts a1 left join accounts a2 on (a1.accounts_id=a2.id) ' +
    '            left join users u1 on (a1.userscreated_id=u1.id) ' +
    '            left join users u2 on (a1.usersmodified_id=u2.id) ' +
    'where ' +
    'a1.customers_id=$1 ' +
    'and ' +
    'a1.dateexpired is null ' +
    'order by ' +
    'a1.path,' +
    'a2.id desc,' +
    'a1.code',
    [
      world.cn.custid
    ],
    function(err, result)
    {
      if (!err)
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
    }
  );
}

function LoadAccount(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'a1.id,' +
    'a1.code,' +
    'a1.name,' +
    'a1.altcode,' +
    'a1.altname,' +
    'a1.itype,' +
    'a1.notes,' +
    'a1.datecreated,' +
    'a1.datemodified,' +
    'a2.id parentid,' +
    'a2.code parentcode,' +
    'a2.name parentname,' +
    'a2.itype parentitype,' +
    'u1.name usercreated,' +
    'u2.name usermodified ' +
    'from ' +
    'accounts a1 left join accounts a2 on (a1.accounts_id=a2.id) ' +
    '            left join users u1 on (a1.userscreated_id=u1.id) ' +
    '            left join users u2 on (a1.usersmodified_id=u2.id) ' +
    'where ' +
    'a1.customers_id=$1 ' +
    'and ' +
    'a1.id=$2',
    [
      world.cn.custid,
      __.sanitiseAsBigInt(world.accountid)
    ],
    function(err, result)
    {
      if (!err)
      {
        global.modhelpers.doTransformFields(result.rows);
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, account: result.rows[0], pdata: world.pdata});
      }
    }
  );
}

function NewAccount(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doNewAccount,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, accountid: result.accountid, parentid: world.parentid, datecreated: result.datecreated, usercreated: result.usercreated, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'accountcreated', {accountid: result.accountid, parentid: world.parentid, datecreated: result.datecreated, usercreated: result.usercreated}, world.spark.id);
      }
    }
  );
}

function SaveAccount(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doSaveAccount,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, accountid: world.accountid, datemodified: result.datemodified, usermodified: result.usermodified, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'accountsaved', {accountid: result.accountid, datemodified: result.datemodified, usermodified: result.usermodified}, world.spark.id);
      }
    }
  );
}

function ChangeAccountNotes(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doChangeAccountNotes,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, accountid: world.accountid, notes: world.notes, datecreated: result.datecreated, usercreated: result.usercreated, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'accountnotechanged', {accountid: world.accountid, notes: world.notes, datecreated: result.datecreated, usercreated: result.usercreated}, world.spark.id);
      }
    }
  );
}

function ChangeAccountParent(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doChangeAccountParent,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, accountid: world.accountid, parentid: world.parentid, datemodified: result.datemodified, usermodified: result.usermodified, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'accountparentchanged', {accountid: world.accountid, parentid: world.parentid, datemodified: result.datemodified, usermodified: result.usermodified}, world.spark.id);
      }
    }
  );
}

function ExpireAccount(world)
{
  global.modhelpers.doSimpleFunc2Tx
  (
    world,
    doExpireAccountStep1,
    doExpireAccountStep2,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, accountid: world.accountid, dateexpired: result.dateexpired, userexpired: result.userexpired, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'accountexpired', {accountid: world.accountid, dateexpired: result.dateexpired, userexpired: result.userexpired}, world.spark.id);
      }
    }
  );
}

function ListTaxCodes(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    't1.id,' +
    't1.code,' +
    't1.name,' +
    't1.notes,' +
    't1.percentage percent,' +
    't1.datecreated,' +
    't1.datemodified,' +
    'u1.name usercreated,' +
    'u2.name usermodified ' +
    'from ' +
    'taxcodes t1 left join users u1 on (t1.userscreated_id=u1.id) ' +
    '            left join users u2 on (t1.usersmodified_id=u2.id) ' +
    'where ' +
    't1.customers_id=$1 ' +
    'and ' +
    't1.dateexpired is null ' +
    'order by ' +
    't1.name',
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

function LoadTaxCode(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    't1.id,' +
    't1.code,' +
    't1.name,' +
    't1.notes,' +
    't1.percentage percent,' +
    't1.datecreated,' +
    't1.datemodified,' +
    'u1.name usercreated,' +
    'u2.name usermodified ' +
    'from ' +
    'taxcodes t1 left join users u1 on (t1.userscreated_id=u1.id) ' +
    '            left join users u2 on (t1.usersmodified_id=u2.id) ' +
    'where ' +
    't1.customers_id=$1 ' +
    'and ' +
    't1.id=$2',
    [
      world.cn.custid,
      __.sanitiseAsBigInt(world.taxcodeid)
    ],
    function(err, result)
    {
      if (!err)
      {
        global.modhelpers.doTransformFields(result.rows);
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, taxcode: result.rows[0], pdata: world.pdata});
      }
    }
  );
}

function NewTaxCode(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doNewTaxCode,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, taxcodeid: result.taxcodeid, datecreated: result.datecreated, usercreated: result.usercreated, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'taxcodecreated', {taxcodeid: result.taxcodeid, datecreated: result.datecreated, usercreated: result.usercreated}, world.spark.id);
      }
    }
  );
}

function SaveTaxCode(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doSaveTaxCode,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, taxcodeid: world.taxcodeid, datemodified: result.datemodified, usermodified: result.usermodified, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'taxcodesaved', {taxcodeid: result.taxcodeid, datemodified: result.datemodified, usermodified: result.usermodified}, world.spark.id);
      }
    }
  );
}

function ExpireTaxCode(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doExpireTaxCode,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, taxcodeid: world.taxcodeid, dateexpired: result.dateexpired, userexpired: result.userexpired, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'taxcodeexpired', {taxcodeid: world.taxcodeid, dateexpired: result.dateexpired, userexpired: result.userexpired}, world.spark.id);
      }
    }
  );
}

function ListSuperfunds(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    's1.id,' +
    's1.name,' +
    's1.datecreated,' +
    's1.datemodified,' +
    'u1.name usercreated,' +
    'u2.name usermodified ' +
    'from ' +
    'superfunds s1 left join users u1 on (s1.userscreated_id=u1.id) ' +
    '              left join users u2 on (s1.usersmodified_id=u2.id) ' +
    'where ' +
    's1.customers_id=$1 ' +
    'and ' +
    's1.dateexpired is null ' +
    'order by ' +
    's1.name',
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

function NewSuperfund(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doNewSuperfund,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, superfundid: world.superfundid, datecreated: result.datecreated, usercreated: result.usercreated, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'superfundcreated', {superfundid: world.superfundid, datecreated: result.datecreated, usercreated: result.usercreated}, world.spark.id);
      }
    }
  );
}

function SaveSuperfund(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doSaveSuperfund,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, superfundid: world.superfundid, datemodified: result.datemodified, usermodified: result.usermodified, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'superfundsaved', {superfundid: world.superfundid, datemodified: result.datemodified, usermodified: result.usermodified}, world.spark.id);
      }
    }
  );
}

function ExpireSuperfund(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doExpireSuperfund,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, superfundid: world.superfundid, dateexpired: result.dateexpired, userexpired: result.userexpired, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'superfundsaved', {superfundid: world.superfundid, dateexpired: result.dateexpired, userexpired: result.userexpired}, world.spark.id);
      }
    }
  );
}

function CheckAccountCode(world)
{
  var binds = [world.cn.custid, world.code, world.code];
  var clause = '';

  if (!__.isNull(world.accountid))
  {
    clause = ' and a1.id!=$4';
    binds.push(world.accountid);
  }

  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'a1.id,' +
    'a1.code,' +
    'a1.name,' +
    'a1.altcode,' +
    'a1.altname ' +
    'from ' +
    'accounts a1 ' +
    'where ' +
    'a1.customers_id=$1 ' +
    'and ' +
    'a1.dateexpired is null ' +
    'and ' +
    '(' +
    'upper(a1.code)=upper($2) ' +
    'or ' +
    'upper(a1.altcode)=upper($3)' +
    ')' +
    clause,
    binds,
    function(err, result)
    {
      if (!err)
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
    }
  );
}

function CheckTaxCode(world)
{
  var binds = [world.cn.custid, world.code];
  var clause = '';

  if (!__.isNull(world.taxcodeid))
  {
    clause = ' and tc1.id!=$3';
    binds.push(world.taxcodeid);
  }

  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'tc1.id,' +
    'tc1.code,' +
    'tc1.name ' +
    'from ' +
    'taxcodes tc1 ' +
    'where ' +
    'tc1.customers_id=$1 ' +
    'and ' +
    'tc1.dateexpired is null ' +
    'and ' +
    'upper(tc1.code)=upper($2)' +
    clause,
    binds,
    function(err, result)
    {
      if (!err)
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
    }
  );
}

function CheckSuperfundName(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    's1.id,' +
    's1.name ' +
    'from ' +
    'superfunds s1 ' +
    'where ' +
    's1.customers_id=$1 ' +
    'and ' +
    's1.dateexpired is null ' +
    'and ' +
    'upper(s1.name)=upper($2)',
    [
      world.cn.custid,
      world.name
    ],
    function(err, result)
    {
      if (!err)
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
    }
  );
}

// *******************************************************************************************************************************************************************************************
// Internal functions
module.exports.doFindTaxCode = doFindTaxCode;
module.exports.doFindAccountCode = doFindAccountCode;
module.exports.doFindSuperfund = doFindSuperfund;

// *******************************************************************************************************************************************************************************************
// Public functions
module.exports.ListAccounts = ListAccounts;
module.exports.LoadAccount = LoadAccount;
module.exports.NewAccount = NewAccount;
module.exports.SaveAccount = SaveAccount;
module.exports.ChangeAccountNotes = ChangeAccountNotes;
module.exports.ChangeAccountParent = ChangeAccountParent;
module.exports.ExpireAccount = ExpireAccount;
module.exports.CheckAccountCode = CheckAccountCode;

module.exports.ListTaxCodes = ListTaxCodes;
module.exports.LoadTaxCode = LoadTaxCode;
module.exports.NewTaxCode = NewTaxCode;
module.exports.SaveTaxCode = SaveTaxCode;
module.exports.ExpireTaxCode = ExpireTaxCode;
module.exports.CheckTaxCode = CheckTaxCode;

module.exports.ListSuperfunds = ListSuperfunds;
module.exports.NewSuperfund = NewSuperfund;
module.exports.SaveSuperfund = SaveSuperfund;
module.exports.ExpireSuperfund = ExpireSuperfund;
module.exports.CheckSuperfundName = CheckSuperfundName;
