// *******************************************************************************************************************************************************************************************
// Internal functions
function doBuildSearchWhereClause(binds, colnames, values, datecolname, datefrom, dateto, idcolname, idlist, maxhistory, callback)
{
  var maxhistory = __.isUN(maxhistory) ? global.config.defaults.defaultmaxhistory : maxhistory;
  var bindno = binds.length + 1;
  var clauses = '';

  for (var c = 0; c < colnames.length; c++)
  {
    if (!__.isUNB(values[c]))
    {
      if (colnames[c].charAt(0) == '#')
      {
        clauses += '(' + colnames[c].substr(1) + ' = $' + bindno++ + ') and ';
        binds.push(values[c]);
      }
      else
      {
        clauses += '(' + colnames[c] + ' ilike $' + bindno++ + ') and ';
        binds.push('%' + __.sanitiseAsString(values[c]) + '%');
      }
    }
  }

  // Any date ranges involved?
  if (!__.isUNB(datecolname))
  {
    if (!__.isUNB(datefrom))
    {
      var df = global.moment(datefrom).format('YYYY-MM-DD 00:00:00');

      if (!__.isUNB(dateto))
      {
        var dt = global.moment(dateto).format('YYYY-MM-DD 23:59:59');

        // Search between datefrom and dateto
        clauses += '(' + datecolname + ' between $' + bindno++ + ' and $' + bindno++ + ') and ';
        binds.push(df);
        binds.push(dt);
      }
      else
      {
        // Search between datefrom and now
        clauses += '(' + datecolname + ' between $' + bindno++ + ' and now()) and ';
        binds.push(df);
      }
    }
    else
    {
      if (!__.isUNB(dateto))
      {
        var dt = global.moment(dateto).format('YYYY-MM-DD 23:59:59');

        // Search between beginning and dateto
        clauses += '(' + datecolname + ' <= $' + bindno++ + ') and ';
        binds.push(df);
      }
    }
  }

  if (!__.isUNB(idcolname) && (idlist.length > 0))
  {
    if (__.isArray(idlist))
    {
      clauses += '(' + idcolname + ' in (';

      idlist.forEach
      (
        function(c, idx)
        {
          if (idx > 0)
            clauses += ',';
          clauses += '$' + bindno++;
          binds.push(c);
        }
      );

      clauses += ')) and ';
    }
  }

  binds.push(maxhistory);

  callback(binds, bindno, clauses);
}

function doTransformFields(rows)
{
  rows.forEach
  (
    function(r)
    {
      if (!__.isUN(r.comments))
        r.comments = __.unescapeHTML(r.comments);

      if (!__.isUN(r.notes))
        r.notes = __.unescapeHTML(r.notes);

      if (!__.isUN(r.refno))
        r.refno = __.unescapeHTML(r.refno);

      // JS returns date with TZ info/format, need in ISO format...
      if (!__.isUN(r.invoicedate))
        r.invoicedate = global.moment(r.invoicedate).format('YYYY-MM-DD HH:mm:ss');

      if (!__.isUN(r.startdate))
        r.startdate = global.moment(r.startdate).format('YYYY-MM-DD HH:mm:ss');

      if (!__.isUN(r.enddate))
        r.enddate = global.moment(r.enddate).format('YYYY-MM-DD HH:mm:ss');

      if (!__.isUN(r.datecompleted))
        r.datecompleted = global.moment(r.datecompleted).format('YYYY-MM-DD HH:mm:ss');

      if (!__.isUN(r.datesent))
        r.datesent = global.moment(r.datesent).format('YYYY-MM-DD HH:mm:ss');

      if (!__.isUN(r.datebuilt))
        r.datebuilt = global.moment(r.datebuilt).format('YYYY-MM-DD HH:mm:ss');

      if (!__.isUN(r.dateactual))
        r.dateactual = global.moment(r.dateactual).format('YYYY-MM-DD HH:mm:ss');

      if (!__.isUN(r.datemodified))
        r.datemodified = global.moment(r.datemodified).format('YYYY-MM-DD HH:mm:ss');

      if (!__.isUN(r.datecreated))
        r.datecreated = global.moment(r.datecreated).format('YYYY-MM-DD HH:mm:ss');
    }
  );
}

function doHeaderDetailQuery(world, sql1, binds1, sql2, callback, f1resultstore)
{
  var msg = '[' + world.eventname + '] ';
  var evname = [];

  evname[world.eventname] = true;
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
          sql1,
          binds1,
          function(err, result)
          {
            if (!err)
            {
              if (result.rows.length > 0)
              {
                var headerobj = result.rows[0];
                var binds2 = [];

                if (!__.isUN(headerobj.datemodified))
                  headerobj.datemodified = global.moment(headerobj.datemodified).format('YYYY-MM-DD HH:mm:ss');

                if (!__.isUN(headerobj.datecreated))
                  headerobj.datecreated = global.moment(headerobj.datecreated).format('YYYY-MM-DD HH:mm:ss');

                if (!__.isUN(f1resultstore))
                  binds2 = f1resultstore(result);

                client.query
                (
                  sql2,
                  binds2,
                  function(err, result)
                  {
                    if (!err)
                    {
                      done();

                      callback(null, headerobj, result);
                    }
                  }
                );
              }
              else
                callback(null, null, null);
            }
            else
            {
              msg += global.text_generalexception + ' ' + err.message;
              global.log.error(evname, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
              callback(err, null);
            }
          }
        );
      }
      else
      {
        done();
        global.log.error(evname, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
        callback(err, null);
      }
    }
  );
}

function doSimpleQuery(world, sql, binds, callback)
{
  var msg = '[' + world.eventname + '] ';
  var evname = [];

  evname[world.eventname] = true;
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
          sql,
          binds,
          function(err, result)
          {
            done();

            if (!err)
              callback(null, result);
            else
            {
              msg += global.text_generalexception + ' ' + err.message;
              global.log.error(evname, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
              callback(err, null);
            }
          }
        );
      }
      else
      {
        done();
        global.log.error(evname, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
        callback(err, null);
      }
    }
  );
}

function doSimpleFunc1Tx(world, f, callback)
{
  var msg = '[' + world.eventname + '] ';
  var evname = [];

  evname[world.eventname] = true;
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
              f(tx, world).then
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
                        callback(null, result);
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error(evname, msg);
                            world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                            callback(err, null);
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
                      global.log.error(evname, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
                      callback(err, null);
                    }
                  );
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error(evname, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
              callback(err, null);
            }
          }
        );
      }
      else
      {
        done();
        global.log.error(evname, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
        callback(err, null);
      }
    }
  );
}

function doSimpleFunc2Tx(world, f1, f2, callback, f1resultstore)
{
  var msg = '[' + world.eventname + '] ';
  var evname = [];

  evname[world.eventname] = true;
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
              f1(tx, world).then
              (
                function(result)
                {
                  if (!__.isUN(f1resultstore))
                    f1resultstore(result);
                  return f2(tx, world);
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
                        callback(null, result);
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error(evname, msg);
                            world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                            callback(err, null);
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
                      global.log.error(evname, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
                      callback(err, null);
                    }
                  );
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error(evname, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
              callback(err, null);
            }
          }
        );
      }
      else
      {
        done();
        global.log.error(evname, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
        callback(err, null);
      }
    }
  );
}

// *******************************************************************************************************************************************************************************************
// Public functions
function CalcRemoveTaxCodeComponent(tx, custid, cost, taxcodeid)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      var tax = 0.0;

      if ((cost > 0) && !__.isNull(taxcodeid))
      {
        // Get the tax code details...
        tx.query
        (
          'select t1.percentage from taxcodes t1 where t1.customers_id=$1 and t1.id = $2',
          [
            custid,
            taxcodeid
          ],
          function(err, result)
          {
            if (!err && !__.isUndefined(result.rows) && (result.rows.length > 0))
            {
              var percent = result.rows[0].percentage;

              if (!__.isBlank(cost) && (cost != 0) && (percent != 0))
              {
                // To remove TAX:
                // (100% + TAX) / x = TAX
                // Therefore x = (100 + TAX) / TAX
                // Therefore to retrieve original value minus TAX component = (total_inc_tax / x)
                // e.g. TAX=10%, total = $4309.31
                // Just divide by 11 - reason - the price equals 100%, the TAX is 10% therefore the total is 110%
                // To get the TAX divide by 11 (i.e. 110% divided by 11 = 10%)
                // So, if $4309.31 is the total, $391.75 is TAX

                divisor = (100.0 + percent) / percent;
                tax = cost / divisor;
              }
            }
            resolve(tax);
          }
        );
      }
      else
        resolve(tax);
    }
  );
  return promise;
}

function CalcTaxCodeComponent(tx, custid, cost, taxcodeid)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      var tax = 0.0;

      if ((cost > 0) && !__.isNull(taxcodeid))
      {
        // Get the tax code details...
        tx.query
        (
          'select t1.percentage from taxcodes t1 where t1.customers_id=$1 and t1.id = $2',
          [
            custid,
            taxcodeid
          ],
          function(err, result)
          {
            if (!err && !__.isUndefined(result.rows) && (result.rows.length > 0))
            {
              var percent = result.rows[0].percentage;

              if (!_.isBlank(cost) && (cost != 0) && (percent != 0))
                tax = (cost * percent) / 100.0;
            }
            resolve(tax);
          }
        );
      }
      else
        resolve(tax);
    }
  );
  return promise;
}

function NewUniqueCode(tx, custid, prefix)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      if (__.isUNB(prefix))
        prefix = global.text_newcode;
      tx.query
      (
        'insert into codesequences (customers_id) values ($1) returning id',
        custid,
        function(err, result)
        {
          if (!err)
          {
            var newcode = prefix + result.rows[0].id;
            resolve(newcode.toString());
          }
          else
            reject(err)
        }
      );
    }
  );
  return promise;
}
// *******************************************************************************************************************************************************************************************
// Internal functions
module.exports.doHeaderDetailQuery = doHeaderDetailQuery;
module.exports.doSimpleQuery = doSimpleQuery;
module.exports.doSimpleFunc1Tx = doSimpleFunc1Tx;
module.exports.doSimpleFunc2Tx = doSimpleFunc2Tx;
module.exports.doTransformFields = doTransformFields;
module.exports.doBuildSearchWhereClause = doBuildSearchWhereClause;

// *******************************************************************************************************************************************************************************************
// Public functions
module.exports.CalcRemoveTaxCodeComponent = CalcRemoveTaxCodeComponent;
module.exports.CalcTaxCodeComponent = CalcTaxCodeComponent;
module.exports.NewUniqueCode = NewUniqueCode;

