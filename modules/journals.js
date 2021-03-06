// *******************************************************************************************************************************************************************************************
// Internal functions
function doNewJournal(tx, data)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      var calls = [];

      data.entries.forEach
      (
        function(e)
        {
          calls.push
          (
            function(callback)
            {
              tx.query
              (
                'insert into journals (customers_id,journalno,debitaccounts_id,creditaccounts_id,amount,itype,refno,comments,userscreated_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
                [
                  data.custid,
                  __.sanitiseAsString(data.journalno),
                  __.sanitiseAsBigInt(e.debitaccountid),
                  __.sanitiseAsBigInt(e.creditaccountid),
                  __.formatnumber(e.amount, 4),
                  __.sanitiseAsBigInt(data.type),
                  __.sanitiseAsComment(data.refno),
                  __.sanitiseAsComment(data.comments),
                  data.userid
                ],
                function(err, result)
                {
                  if (!err)
                  {
                    if (!__.isNull(e.taxcodeid) && !__.isBlank(e.taxcodeid))
                    {
                      // Add entry for GST... or whatever tax code it is...
                      tx.query
                      (
                        'insert into journals (customers_id,journalno,debitaccounts_id,creditaccounts_id,taxcodes_id,amount,itype,refno,comments,userscreated_id) values ($1,$2,$3,$4,$5,calctaxcomponent($6,$7,$8),$9,$10,$11,$12)',
                        [
                          data.custid,
                          __.sanitiseAsString(data.journalno),
                          __.sanitiseAsBigInt(e.debitaccountid),
                          __.sanitiseAsBigInt(e.creditaccountid),
                          __.sanitiseAsBigInt(e.taxcodeid),
                          //
                          data.custid,
                          __.notNullNumeric(e.amount, 4),
                          __.sanitiseAsBigInt(e.taxcodeid),
                          //
                          __.sanitiseAsBigInt(data.type),
                          __.sanitiseAsComment(data.refno),
                          __.sanitiseAsComment(data.comments),
                          data.userid
                        ],
                        function(err, result)
                        {
                          if (!err)
                            callback(null);
                          else
                            callback(err);
                        }
                      );
                    }
                    else
                      callback(null);
                  }
                  else
                    callback(err);
                }
              );
            }
          );
        }
      );

      global.async.series
      (
        calls,
        function(err, results)
        {
          if (!err)
          {
            resolve(results);
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doAddJournalEntry(tx, data)
{
  var promise = new global.rsvp.Promise
  (
    function (resolve, reject)
    {
      global.modconfig.doNextJournalNo(tx, data.custid).then
      (
        function(result)
        {
          data.journalno = result.journalno;
          return doNewJournal(tx, data);
        }
      ).then
      (
        function(err)
        {
          resolve(null);
        }
      ).then
      (
        null,
        function(err)
        {
          reject(err);
        }
      );
    }
  );
  return promise;
}

// *******************************************************************************************************************************************************************************************
// Public functions
function ListJournals(world)
{
  var maxhistory = __.isUN(maxhistory) ? global.config.defaults.defaultmaxhistory : maxhistory;

  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'j1.id,' +
    'j1.journalno,' +
    'j1.debitaccounts_id debitaccountid,' +
    'j1.creditaccounts_id creditaccountid,' +
    'j1.datecreated,' +
    'j1.dateactual,' +
    'j1.itype,' +
    'j1.amount,' +
    'j1.otherid,' +
    'j1.taxcodes_id taxcodeid,' +
    'j1.refno,' +
    'j1.comments,' +
    'a1.code debitaccountcode,' +
    'a1.name debitaccountname,' +
    'a2.code creditaccountcode,' +
    'a2.name creditaccountname,' +
    'u1.name usercreated,' +
    'case when (j1.itype = cast ($1 as smallint)) then '+
    'o1.orderno '+
    'else '+
    'null '+
    'end '+
    'as otherno '+
    'from ' +
    'journals j1 left join accounts a1 on (j1.debitaccounts_id=a1.id) ' +
    '            left join accounts a2 on (j1.creditaccounts_id=a2.id) ' +
    '            left join users u1 on (j1.userscreated_id=u1.id) ' +
    '            left join orders o1 on (j1.otherid=o1.id) ' +
    'where ' +
    'j1.customers_id=$2 ' +
    'order by ' +
    'j1.dateactual desc,' +
    'j1.journalno ' +
    'limit $3',
    [
      global.itype_journal_sales,
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

function NewJournal(world)
{
  global.modhelpers.doSimpleFunc2Tx
  (
    world,
    global.modconfig.doNextJournalNo,
    doNewJournal,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, journalno: world.journalno, datecreated: result.datecreated, usercreated: result.usercreated, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'journaladded', {journalno: world.journalno, datecreated: result.datecreated, usercreated: result.usercreated}, world.spark.id);
        global.pr.sendToRoom(global.custchannelprefix + world.cn.custid, 'configsaved', {});
      }
    },
    function(f1result)
    {
      world.journalno = f1result.journalno;
      world.custid = world.cn.custid;
      world.userid = world.cn.userid;
    }
  );
}

function TestJournal(world)
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
        // First debits...
        client.query
        (
          'select ' +
          'sum(j1.amount) debits,' +
          'case ' +
          'when a1.itype=1 then \'Assets\' ' +
          'when a1.itype=2 then \'Expenses\' ' +
          'when a1.itype=3 then \'Liabilities\' ' +
          'when a1.itype=4 then \'Equities\' ' +
          'when a1.itype=5 then \'Revenues\' ' +
          'when a1.itype=6 then \'Cost of Goods Sold\' ' +
          'when a1.itype=7 then \'Other Revenue\' ' +
          'when a1.itype=8 then \'Other Expenses\' ' +
          'when a1.itype=99 then \'Bank\' ' +
          'end as typename ' +
          'from ' +
          'journals j1 left join accounts a1 on (j1.debitaccounts_id=a1.id) ' +
          'where ' +
          'j1.customers_id=$1 ' +
          'group by ' +
          'a1.itype',
          [
            world.cn.custid
          ],
          function(err, result)
          {
            if (!err)
            {
              var debits = result.rows;
              // Credits...
              client.query
              (
                'select ' +
                'sum(j1.amount) credits,' +
                'case ' +
                'when a1.itype=1 then \'Assets\' ' +
                'when a1.itype=2 then \'Expenses\' ' +
                'when a1.itype=3 then \'Liabilities\' ' +
                'when a1.itype=4 then \'Equities\' ' +
                'when a1.itype=5 then \'Revenues\' ' +
                'when a1.itype=6 then \'Cost of Goods Sold\' ' +
                'when a1.itype=7 then \'Other Revenue\' ' +
                'when a1.itype=8 then \'Other Expenses\' ' +
                'when a1.itype=99 then \'Bank\' ' +
                'end as typename ' +
                'from ' +
                'journals j1 left join accounts a1 on (j1.creditaccounts_id=a1.id) ' +
                'where ' +
                'j1.customers_id=$1 ' +
                'group by ' +
                'a1.itype',
                [
                  world.cn.custid
                ],
                function(err, result)
                {
                  done();

                  if (!err)
                    world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs1: debits, rs2: result.rows, pdata: world.pdata});
                  else
                  {
                    msg += global.text_generalexception + ' ' + err.message;
                    global.log.error({testjournals: true}, msg);
                    world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
                  }
                }
              );
            }
            else
            {
              msg += global.text_generalexception + ' ' + err.message;
              global.log.error({testjournals: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({testjournals: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

module.exports.doAddJournalEntry = doAddJournalEntry;

// *******************************************************************************************************************************************************************************************
// Public functions
module.exports.ListJournals = ListJournals;
module.exports.NewJournal = NewJournal;
module.exports.TestJournal = TestJournal;
