// *******************************************************************************************************************************************************************************************
// Internal functions
function doNewPOSOrderDetails(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      if (!__.isNull(world.products) && (world.products.length > 0))
      {
        var calls = [];

        world.products.forEach
        (
          function(p)
          {
            calls.push
            (
              function(callback)
              {
                global.modorders.doNewOrderDetail(tx, world.cn.custid, world.cn.userid, world.orderid, world.version, p.id, p.qty, p.exgst, p.gst, p.discount, null).then
                (
                  function(result)
                  {
                    callback(null, {orderdetailid: result.orderdetailid});
                  }
                ).then
                (
                  null,
                  function(err)
                  {
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
              resolve(null);
            else
              reject(err);
          }
        );
      }
    }
  );
  return promise;
}

function doPOSNewOrder(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      var clientid = __.isUN(world.clientid) ? world.custconfig.posclientid : world.clientid;

      if (!__.isUN(clientid))
      {
        tx.query
        (
          'insert into orders (customers_id,quoteno,orderno,clients_id,name,invoiceto_address1,invoiceto_city,invoiceto_state,invoiceto_postcode,invoiceto_country,shipto_address1,shipto_city,shipto_state,shipto_postcode,shipto_country,mobileno,email,userscreated_id) ' +
          'select cast($1 as bigint),cast($2 as character varying),cast($3 as character varying),cast($4 as bigint),c1.name,c1.address1,c1.city,c1.state,c1.postcode,c1.country,c1.shipaddress1,c1.shipcity,c1.shipstate,c1.shippostcode,c1.shipcountry,cast($5 as character varying),cast($6 as character varying),cast($7 as bigint) from clients c1 where c1.customers_id=$8 and c1.id=$9 returning id,datecreated,activeversion,name,invoiceto_address1,invoiceto_city,invoiceto_state,invoiceto_postcode,invoiceto_country',
          [
            world.cn.custid,
            __.sanitiseAsString(world.quoteno),
            __.sanitiseAsString(world.orderno),
            __.sanitiseAsBigInt(clientid),
            __.makeisomobile(__.sanitiseAsString(world.mobileno)),
            __.sanitiseAsString(world.email),
            world.cn.userid,
            world.cn.custid,
            __.sanitiseAsBigInt(clientid)
          ],
          function(err, result)
          {
            if (!err)
            {
              if (result.rows.length > 0)
              {
                var r = result.rows[0];
                var orderid = r.id;
                var version = r.activeversion;
                var datecreated = global.moment(r.datecreated).format('YYYY-MM-DD HH:mm:ss');
                var clientname = r.name;
                var address1 = r.invoiceto_address1;
                var city = r.invoiceto_city;
                var state = r.invoiceto_state;
                var postcode = r.invoiceto_postcode;
                var country = r.invoiceto_country;

                resolve
                (
                  {
                    orderid: orderid,
                    version: version,
                    datecreated: datecreated,
                    clientname: clientname,
                    address1: address1,
                    city: city,
                    state: state,
                    postcode: postcode,
                    country: country
                  }
                );
              }
              else
                reject({message: global.text_unableneworder});
            }
            else
              reject(err);
          }
        );
      }
      else
      {
        tx.query
        (
          'insert into orders (customers_id,quoteno,orderno,mobileno,email,userscreated_id) values ($1,$2,$3,$4,$5,$6) returning id,datecreated,activeversion',
          [
            world.cn.custid,
            __.sanitiseAsString(world.quoteno),
            __.sanitiseAsString(world.orderno),
            __.makeisomobile(__.sanitiseAsString(world.mobileno)),
            __.sanitiseAsString(world.email),
            world.cn.userid
          ],
          function(err, result)
          {
            if (!err)
            {
              if (result.rows.length > 0)
              {
                var r = result.rows[0];
                var orderid = r.id;
                var version = r.activeversion;
                var datecreated = global.moment(r.datecreated).format('YYYY-MM-DD HH:mm:ss');

                resolve
                (
                  {
                    orderid: orderid,
                    version: version,
                    datecreated: datecreated
                  }
                );
              }
              else
                reject({message: global.text_unableneworder});
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

function doPOSExitingOrder(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      // Update version as well...
      tx.query
      (
        'update orders set numversions=numversions+1,activeversion=numversions+1,datemodified=now(),usersmodified_id=$1 where customers_id=$2 and quoteno=$3 and dateexpired is null returning id,activeversion,datemodified,name,invoiceto_address1,invoiceto_city,invoiceto_state,invoiceto_postcode,invoiceto_country',
        [
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsString(world.quoteno)
        ],
        function(err, result)
        {
          if (!err)
          {
            var r = result.rows[0];
            var orderid = r.id;
            var version = r.activeversion;
            var datemodified = global.moment(r.datemodified).format('YYYY-MM-DD HH:mm:ss')
            var clientname = r.name;
            var address1 = r.invoiceto_address1;
            var city = r.invoiceto_city;
            var state = r.invoiceto_state;
            var postcode = r.invoiceto_postcode;
            var country = r.invoiceto_country;

            resolve
            (
              {
                orderid: orderid,
                version: version,
                datemodified: datemodified,
                clientname: clientname,
                address1: address1,
                city: city,
                state: state,
                postcode: postcode,
                country: country
              }
            );
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
function POSGetProduct(world)
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
        var code = __.sanitiseAsString(world.code);

        if (!__.isBlank(code))
        {
          // Check if barcode prefix is one of ours... (the country/company fixed portion of the barcode)
          if (!__.isBlank(world.custconfig.currentbarcodeno))
          {
            if (code.substring(0, global.config.barcodes.prefixlength) == world.custconfig.currentbarcodeno.substring(0, global.config.barcodes.prefixlength))
            {
              // Barcode reader adds check digit to end of the keyboard buffer...
              // On the other hand, if barcode is entered manuallu, might not have the check digit...
              if (code.length > global.config.barcodes.length)
                code = code.substring(0, code.length - 1);
            }
          }

          code = '%' + code + '%';

          client.query
          (
            'select ' +
            'p1.id,' +
            'p1.code,' +
            'p1.name,' +
            'p1.barcode,' +
            'p1.costprice,' +
            'pc1.price exgst,' +
            'pc1.gst,' +
            'pc1.price + pc1.gst price,' +
            'p1.uomsize,' +
            'tc1.id taxcodeid,' +
            'tc1.code taxcode,' +
            'tc1.percentage tax,' +
            'getproductinventorytotalforlocation($1,$2,p1.id) stockqty ' +
            'from ' +
            'products p1 left join pricing pc1 on (p1.id=pc1.products_id) ' +
            '            left join productcodes c1 on (p1.id=c1.products_id) ' +
            '            left join taxcodes tc1 on (p1.selltaxcodes_id=tc1.id) ' +
            'where ' +
            'p1.customers_id=$3 ' +
            'and ' +
            'p1.dateexpired is null ' +
            'and ' +
            '(' +
            'p1.code ilike $4 ' +
            'or ' +
            'p1.barcode ilike $5 ' +
            'or ' +
            'c1.code ilike $6 ' +
            'or ' +
            'c1.barcode ilike $7 ' +
            'or ' +
            'p1.name ilike $8' +
            ') ' +
            'order by ' +
            'p1.name,' +
            'p1.code',
            [
              world.cn.custid,
              global.config.pos.locationid_warehouse,
              world.cn.custid,
              code,
              code,
              code,
              code,
              code
            ],
            function(err, result)
            {
              done();

              if (!err)
                world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
              else
              {
                msg += global.text_generalexception + ' ' + err.message;
                global.log.error({posgetproduct: true}, msg);
                world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
              }
            }
          );
        }
        else
          world.spark.emit(world.eventname, {rc: global.errcode_nodata, msg: global.text_nodata, fguid: world.fguid, pdata: world.pdata});
      }
      else
      {
        global.log.error({posgetproduct: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function POSGenBarcode(world)
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
              global.modconfig.doNextBarcodeNo(tx, world).then
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

                        world.spark.emit
                        (
                          world.eventname,
                          {
                            rc: global.errcode_none,
                            msg: global.text_success,
                            barcodeno: result.barcodeno,
                            pdata: world.pdata
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
                            global.log.error({posgenbarcode: true}, msg);
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
                      global.log.error({posgenbarcode: true}, msg);
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
              global.log.error({posgenbarcode: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
        }
        );
      }
      else
      {
        global.log.error({posgenbarcode: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function POSNewQuote(world)
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
              world.isquote = true;

              global.modconfig.doNextQuoteNo(tx, world).then
              (
                function(result)
                {
                  world.quoteno = result.quoteno;
                  return doPOSNewOrder(tx, world);
                }
              ).then
              (
                function(result)
                {
                  world.orderid = result.orderid;
                  world.version = result.version;
                  world.datecreated = result.datecreated;
                  world.clientname = result.clientname;
                  world.address1 = result.address1;
                  world.city = result.city;
                  world.state = result.state;
                  world.postcode = result.postcode;
                  world.country = result.country;
                  //
                  return doNewPOSOrderDetails(tx, world);
                }
              ).then
              (
                function(result)
                {
                  return global.modorders.doUpdateOrderTotals(tx, world);
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
                        world.spark.emit
                        (
                          world.eventname,
                          {
                            rc: global.errcode_none,
                            msg: global.text_success,
                            orderid: world.orderid,
                            quoteno: world.quoteno,
                            clientid: world.clientid,
                            clientname: world.clientname,
                            address1: world.address1,
                            city: world.city,
                            state: world.state,
                            postcode: world.postcode,
                            country: world.country,
                            datecreated: world.datecreated,
                            pdata: world.pdata
                          }
                        );
                        global.pr.sendToRoomExcept
                        (
                          global.custchannelprefix + world.cn.custid,
                          'ordercreated',
                          {
                            orderid: world.orderid,
                            quoteno: world.quoteno,
                            clientid: world.clientid,
                            clientname: world.clientname,
                            address1: world.address1,
                            city: world.city,
                            state: world.state,
                            postcode: world.postcode,
                            country: world.country,
                            datecreated: world.datecreated
                          },
                          world.spark.id
                        );
                        // We also updated config (with new quoteno) so let everyone know that too...
                        global.pr.sendToRoom(global.custchannelprefix + world.cn.custid, 'configsaved', {});
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error({posnewuote: true}, msg);
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
                      global.log.error({posnewuote: true}, msg);
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
              global.log.error({posnewuote: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        global.log.error({posnewuote: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function POSQuote(world)
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
              doPOSExitingOrder(tx, world).then
              (
                function(result)
                {
                  world.orderid = result.orderid;
                  world.version = result.version;
                  world.datemodified = result.datemodified;
                  world.clientname = result.clientname;
                  world.address1 = result.address1;
                  world.city = result.city;
                  world.state = result.state;
                  world.postcode = result.postcode;
                  world.country = result.country;
                  //
                  return doNewPOSOrderDetails(tx, world);
                }
              ).then
              (
                function(result)
                {
                  return global.modorders.doUpdateOrderTotals(tx, world);
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
                        world.spark.emit
                        (
                          world.eventname,
                          {
                            rc: global.errcode_none,
                            msg: global.text_success,
                            orderid: world.orderid,
                            quoteno: world.quoteno,
                            version: world.version,
                            clientid: world.clientid,
                            clientname: world.clientname,
                            address1: world.address1,
                            city: world.city,
                            state: world.state,
                            postcode: world.postcode,
                            country: world.country,
                            datemodified: world.datemodified,
                            pdata: world.pdata
                          }
                        );
                        global.pr.sendToRoomExcept
                        (
                          global.custchannelprefix + world.cn.custid,
                          'ordercreated',
                          {
                            orderid: world.orderid,
                            quoteno: world.quoteno,
                            version: world.version,
                            address1: world.address1,
                            city: world.city,
                            state: world.state,
                            postcode: world.postcode,
                            country: world.country,
                            datemodified: world.datemodified
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
                            global.log.error({posquote: true}, msg);
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
                      global.log.error({posquote: true}, msg);
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
              global.log.error({posquote: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
      global.log.error({posquote: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function POSCashSale(world)
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
            var cash = null;
            var total = null;
            var totalgst = null;
            var tendered = null;
            var change = null;

            if (!err)
            {
              global.modconfig.doNextOrderNo(tx, world).then
              (
                function(result)
                {
                  world.orderno = result.orderno;
                  world.version = 1;
                  //
                  return doPOSNewOrder(tx, world);
                }
              ).then
              (
                function(result)
                {
                  world.orderid = result.orderid;
                  world.datecreated = result.datecreated;
                  world.clientname = result.clientname;
                  world.address1 = result.address1;
                  world.city = result.city;
                  world.state = result.state;
                  world.postcode = result.postcode;
                  world.country = result.country;
                  //
                  return doNewPOSOrderDetails(tx, world);
                }
              ).then
              (
                function(result)
                {
                  return global.modorders.doUpdateOrderTotals(tx, world);
                }
              ).then
              (
                function(result)
                {
                  totalgst = result.totalgst;
                  total = __.toBigNum(world.total);
                  cash = __.toBigNum(world.cash);

                  if (cash.greaterThan(total))
                  {
                    tendered = cash;
                    change = cash.minus(total);
                    cash = total;
                  }

                  world.invoices =
                  [
                    {
                      orderid: world.orderid,
                      type: global.itype_paymenttype_cash,
                      reason: global.itype_paymentreason_pos,
                      amount: __.sanitiseAsPrice(cash, 2),
                      tendered: __.sanitiseAsPrice(tendered, 2),
                      change: __.sanitiseAsPrice(change, 2)
                    }
                  ];

                  world.locationid = global.config.pos.locationid_warehouse;
                  return global.modinvoices.doPayment(tx, world);
                }
              ).then
              (
                function(result)
                {
                  world.commitstatus = global.itype_os_paid;
                  return global.modorders.doInventoryAdjust(tx, world);
                }
              ).then
              (
                function(ignore)
                {
                  return global.modorders.doCommitOrderInventory(tx, world);
                }
              ).then
              (
                function(ignore)
                {
                  return global.modconfig.doNextInvoiceNo(tx, world);
                }
              ).then
              (
                function(result)
                {
                  world.invoiceno = __.isUN(result) ? null : result.invoiceno;
                  //
                  return global.modorders.doSaveInvoice(tx, world);
                }
              ).then
              (
                function(ignore)
                {
                  world.status = global.itype_os_invoiced;
                  return global.modorders.doNewOrderStatus(tx, world);
                }
              ).then
              (
                function(ignore)
                {
                  // Send alert last after all db functions have succeeded, otherwise we send an alert for a failed status update...
                  return global.modorders.doSendStatusAlerts(tx, world);
                }
              ).then
              (
                function(ignore)
                {
                  world.status = global.itype_os_paid;
                  return global.modorders.doNewOrderStatus(tx, world);
                }
              ).then
              (
                function(ignore)
                {
                  return global.modorders.doSendStatusAlerts(tx, world);
                }
              ).then
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
                        world.spark.emit
                        (
                          world.eventname,
                          {
                            rc: global.errcode_none,
                            msg: global.text_success,
                            orderid: world.orderid,
                            orderno: world.orderno,
                            total: __.sanitiseAsPrice(total, 2),
                            totalgst: __.sanitiseAsPrice(totalgst, 2),
                            cash: __.sanitiseAsPrice(cash, 2),
                            tendered: __.sanitiseAsPrice(tendered, 2),
                            change: __.sanitiseAsPrice(change, 2),
                            clientid: world.clientid,
                            clientname: world.clientname,
                            address1: world.address1,
                            city: world.city,
                            state: world.state,
                            postcode: world.postcode,
                            country: world.country,
                            datecreated: world.datecreated,
                            usercreated: world.cn.uname,
                            pdata: world.pdata
                          }
                        );
                        global.pr.sendToRoomExcept
                        (
                          global.custchannelprefix + world.cn.custid,
                          'ordercreated',
                          {
                            orderid: world.orderid,
                            orderno: world.orderno,
                            total: __.sanitiseAsPrice(total, 2),
                            totalgst: __.sanitiseAsPrice(totalgst, 2),
                            cash: __.sanitiseAsPrice(cash, 2),
                            tendered: __.sanitiseAsPrice(tendered, 2),
                            change: __.sanitiseAsPrice(change, 2),
                            clientid: world.clientid,
                            clientname: world.clientname,
                            address1: world.address1,
                            city: world.city,
                            state: world.state,
                            postcode: world.postcode,
                            country: world.country,
                            datecreated: world.datecreated,
                            usercreated: world.cn.uname
                          },
                          world.spark.id
                        );
                        global.pr.sendToRoom(global.custchannelprefix + world.cn.custid, 'orderpaid', {});
                        // We also updated config (with new orderno) so let everyone know that too...
                        global.pr.sendToRoom(global.custchannelprefix + world.cn.custid, 'configsaved', {});
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error({poscashsale: true}, msg);
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
                      global.log.error({poscashsale: true}, msg);
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
              global.log.error({poscashsale: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({poscashsale: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function POSCreditSale(world)
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
            var totalgst = null;

            if (!err)
            {
              global.modconfig.doNextOrderNo(tx, world).then
              (
                function(result)
                {
                  world.orderno = result.orderno;
                  world.version = 1;
                  //
                  return doPOSNewOrder(tx, world);
                }
              ).then
              (
                function(result)
                {
                  world.orderid = result.orderid;
                  world.datecreated = result.datecreated;
                  world.clientname = result.clientname;
                  world.address1 = result.address1;
                  world.city = result.city;
                  world.state = result.state;
                  world.postcode = result.postcode;
                  world.country = result.country;
                  //
                  return doNewPOSOrderDetails(tx, world);
                }
              ).then
              (
                function(result)
                {
                  return global.modorders.doUpdateOrderTotals(tx, world);
                }
              ).then
              (
                function(result)
                {
                  totalgst = result.totalgst;

                  world.invoices =
                  [
                    {
                      orderid: world.orderid,
                      type: global.itype_paymenttype_cc,
                      reason: global.itype_paymentreason_pos,
                      amount: world.credit,
                      tendered: null,
                      change: null
                    }
                  ];

                  world.locationid = global.config.pos.locationid_warehouse;
                  return global.modinvoices.doPayment(tx, world);
                }
              ).then
              (
                function(result)
                {
                  world.commitstatus = global.itype_os_paid;
                  return global.modorders.doInventoryAdjust(tx, world);
                }
              ).then
              (
                function(ignore)
                {
                  // If we previously adjusted inventory, flag order that we've committed it in case same status recorded again...
                  return global.modorders.doCommitOrderInventory(tx, world);
                }
              ).then
              (
                function(ignore)
                {
                  return global.modconfig.doNextInvoiceNo(tx, world);
                }
              ).then
              (
                function(result)
                {
                  world.invoiceno = __.isUN(result) ? null : result.invoiceno;
                  //
                  return global.modorders.doSaveInvoice(tx, world);
                }
                ).then
                (
                  function(result)
                  {
                    world.status = global.itype_os_invoiced;
                    return global.modorders.doNewOrderStatus(tx, world);
                  }
                ).then
              (
                function(ignore)
                {
                  // Send alert last after all db functions have succeeded, otherwise we send an alert for a failed status update...
                  return global.modorders.doSendStatusAlerts(tx, world);
                }
              ).then
              (
                function(ignore)
                {
                  world.status = global.itype_os_paid;
                  return global.modorders.doNewOrderStatus(tx, world);
                }
              ).then
              (
                function(result)
                {
                  return global.modorders.doSendStatusAlerts(tx, world);
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
                        world.spark.emit
                        (
                          world.eventname,
                          {
                            rc: global.errcode_none,
                            msg: global.text_success,
                            orderid: world.orderid,
                            orderno: world.orderno,
                            total: world.total,
                            totalgst: __.sanitiseAsPrice(totalgst, 2),
                            credit: world.credit,
                            clientid: world.clientid,
                            clientname: world.clientname,
                            address1: world.address1,
                            city: world.city,
                            state: world.state,
                            postcode: world.postcode,
                            country: world.country,
                            datecreated: world.datecreated,
                            usercreated: world.cn.uname,
                            pdata: world.pdata
                          }
                        );
                        global.pr.sendToRoomExcept
                        (
                          global.custchannelprefix + world.cn.custid,
                          'ordercreated',
                          {
                            orderid: world.orderid,
                            orderno: world.orderno,
                            total: world.total,
                            totalgst: __.sanitiseAsPrice(totalgst, 2),
                            credit: world.credit,
                            clientid: world.clientid,
                            clientname: world.clientname,
                            address1: world.address1,
                            city: world.city,
                            state: world.state,
                            postcode: world.postcode,
                            country: world.country,
                            datecreated: world.datecreated,
                            usercreated: world.cn.uname
                          },
                          world.spark.id
                        );
                        global.pr.sendToRoom(global.custchannelprefix + world.cn.custid, 'orderpaid', {});
                        // We also updated config (with new orderno) so let everyone know that too...
                        global.pr.sendToRoom(global.custchannelprefix + world.cn.custid, 'configsaved', {});
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error({poscreditsale: true}, msg);
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
                      global.log.error({poscreditsale: true}, msg);
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
              global.log.error({poscreditsale: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        global.log.error({poscreditsale: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function POSSplitSale(world)
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
            var totalgst = null;

            if (!err)
            {
              global.modconfig.doNextOrderNo(tx, world).then
              (
                function(result)
                {
                  world.orderno = result.orderno;
                  world.version = 1;
                  //
                  return doPOSNewOrder(tx, world);
                }
              ).then
              (
                function(result)
                {
                  world.orderid = result.orderid;
                  world.datecreated = result.datecreated;
                  world.clientname = result.clientname;
                  world.address1 = result.address1;
                  world.city = result.city;
                  world.state = result.state;
                  world.postcode = result.postcode;
                  world.country = result.country;
                  //
                  return doNewPOSOrderDetails(tx, world);
                }
              ).then
              (
                function(result)
                {
                  return global.modorders.doUpdateOrderTotals(tx, world);
                }
              ).then
              (
                function(result)
                {
                  totalgst = result.totalgst;

                  world.invoices =
                  [
                    {
                      orderid: world.orderid,
                      type: global.itype_paymenttype_cash,
                      reason: global.itype_paymentreason_pos,
                      amount: world.cash,
                      tendered: world.cash,
                      change: null
                    },
                    {
                      orderid: world.orderid,
                      type: global.itype_paymenttype_cc,
                      reason: global.itype_paymentreason_pos,
                      amount: world.credit,
                      tendered: null,
                      change: null
                    }
                  ];
                  return global.modinvoices.doPayment(tx, world);
                }
              ).then
              (
                function(result)
                {
                  world.commitstatus = global.itype_os_paid;
                  return global.modorders.doInventoryAdjust(tx, world);
                }
              ).then
              (
                function(ignore)
                {
                  // If we previously adjusted inventory, flag order that we've committed it in case same status recorded again...
                  return global.modorders.doCommitOrderInventory(tx, world);
                }
              ).then
              (
                function(ignore)
                {
                  return global.modconfig.doNextInvoiceNo(tx, world);
                }
              ).then
              (
                function(result)
                {
                  world.invoiceno = __.isUN(result) ? null : result.invoiceno;
                  //
                  return global.modorders.doSaveInvoice(tx, world);
                }
              ).then
              (
                function(result)
                {
                  world.status = global.itype_os_invoiced;
                  return global.modorders.doNewOrderStatus(tx, world);
                }
              ).then
              (
                function(ignore)
                {
                  // Send alert last after all db functions have succeeded, otherwise we send an alert for a failed status update...
                  return global.modorders.doSendStatusAlerts(tx, world);
                }
              ).then
              (
                function(ignore)
                {
                  world.status = global.itype_os_paid;
                  return global.modorders.doNewOrderStatus(tx, world);
                }
              ).then
              (
                function(result)
                {
                  return global.modorders.doSendStatusAlerts(tx, world);
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
                        world.spark.emit
                        (
                          world.eventname,
                          {
                            rc: global.errcode_none,
                            msg: global.text_success,
                            orderid: world.orderid,
                            orderno: world.orderno,
                            total: world.total,
                            totalgst: __.sanitiseAsPrice(totalgst, 2),
                            cash: world.cash,
                            credit: world.credit,
                            clientid: world.clientid,
                            clientname: world.clientname,
                            address1: world.address1,
                            city: world.city,
                            state: world.state,
                            postcode: world.postcode,
                            country: world.country,
                            datecreated: world.datecreated,
                            usercreated: world.cn.uname,
                            pdata: world.pdata
                          }
                        );
                        global.pr.sendToRoomExcept
                        (
                          global.custchannelprefix + world.cn.custid,
                          'ordercreated',
                          {
                            orderid: world.orderid,
                            orderno: world.orderno,
                            total: world.total,
                            totalgst: __.sanitiseAsPrice(totalgst, 2),
                            cash: world.cash,
                            credit: world.credit,
                            clientid: world.clientid,
                            clientname: world.clientname,
                            address1: world.address1,
                            city: world.city,
                            state: world.state,
                            postcode: world.postcode,
                            country: world.country,
                            datecreated: world.datecreated,
                            usercreated: world.cn.uname
                          },
                          world.spark.id
                        );
                        global.pr.sendToRoom(global.custchannelprefix + world.cn.custid, 'orderpaid', {});
                        // We also updated config (with new orderno) so let everyone know that too...
                        global.pr.sendToRoom(global.custchannelprefix + world.cn.custid, 'configsaved', {});
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error({possplitsale: true}, msg);
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
                      global.log.error({possplitsale: true}, msg);
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
              global.log.error({possplitsale: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        global.log.error({possplitsale: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function POSSearchSale(world)
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
        var maxhistory = __.isUN(world.maxhistory) ? 50 : world.maxhistory;
        var clauses = '';
        var binds = [world.cn.custid];
        var bindno = binds.length + 1;

        if (!__.isUNB(world.orderno))
        {
          clauses += '((o1.orderno ilike $' + bindno++ + ') or (o1.quoteno ilike $' + bindno++ + ')) and ';
          binds.push('%' + world.orderno + '%');
          binds.push('%' + world.orderno + '%');
        }

        if (!__.isUNB(world.datefrom))
        {
          var df = global.moment(world.datefrom).format('YYYY-MM-DD 00:00:00');

          if (!__.isUNB(world.dateto))
          {
            var dt = global.moment(world.dateto).format('YYYY-MM-DD 23:59:59');

            // Search between datefrom and dateto
            clauses += '(o1.datecreated between $' + bindno++ + ' and $' + bindno++ + ') and ';
            binds.push(df);
            binds.push(dt);
          }
          else
          {
            // Search between datefrom and now
            clauses += '(o1.datecreated between $' + bindno++ + ' and now()) and ';
            binds.push(df);
          }
        }
        else
        {
          if (!__.isUNB(world.dateto))
          {
            var dt = global.moment(world.dateto).format('YYYY-MM-DD 23:59:59');

            // Search between beginning and dateto
            clauses += '(o1.datecreated <= $' + bindno++ + ') and ';
            binds.push(df);
          }
        }

        // Lastly, make sure we don't end up with too many rows...
        binds.push(maxhistory);

        client.query
        (
          'select ' +
          'o1.id,' +
          'o1.quoteno,' +
          'o1.orderno,' +
          'o1.datecreated,' +
          'o1.totalprice,' +
          'o1.totalgst,' +
          'o1.totalprice + o1.totalgst total,' +
          'o1.mobileno,' +
          'o1.email,' +
          'o1.datecreated,' +
          'u1.name usercreated ' +
          'from ' +
          'orders o1 left join users u1 on (o1.userscreated_id=u1.id) ' +
          'where ' +
          'o1.customers_id=$1 ' +
          'and ' +
          clauses +
          'o1.dateexpired is null ' +
          'order by ' +
          'o1.datecreated desc ' +
          'limit $' + bindno,
          binds,
          function(err, result)
          {
            done();

            if (!err)
            {
              result.rows.forEach
              (
                function(o)
                {
                  o.datecreated = global.moment(o.datecreated).format('YYYY-MM-DD HH:mm:ss');
                }
              );

              world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
            }
            else
            {
              msg += global.text_generalexception + ' ' + err.message;
              global.log.error({possearchsale: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_fatal, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        global.log.error({possearchsale: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function POSLoadSale(world)
{
  global.modhelpers.doHeaderDetailQuery
  (
    world,
    'select ' +
    'o1.id,' +
    'o1.quoteno,' +
    'o1.orderno,' +
    'o1.datecreated,' +
    'o1.totalprice,' +
    'o1.totalgst,' +
    'o1.totalprice + o1.totalgst total,' +
    'o1.mobileno,' +
    'o1.email,' +
    'o1.activeversion,' +
    'o1.datecreated,' +
    'o1.invoiceto_address1 invoicetoaddress1,' +
    'o1.invoiceto_address2 invoicetoaddress2,' +
    'o1.invoiceto_city invoicetocity,' +
    'o1.invoiceto_state invoicetostate,' +
    'o1.invoiceto_postcode invoicetopostcode,' +
    'o1.invoiceto_country invoicetocountry,' +
    'o1.shipto_address1 shiptoaddress1,' +
    'o1.shipto_address2 shiptoaddress2,' +
    'o1.shipto_city shiptocity,' +
    'o1.shipto_state shiptostate,' +
    'o1.shipto_postcode shiptopostcode,' +
    'o1.shipto_country shiptocountry,' +
    'y1.tendered,' +
    'y1.change,' +
    'y1.paymenttype,' +
    'o1.clients_id clientid,' +
    'c1.name clientname,' +
    'u1.name usercreated ' +
    'from ' +
    'orders o1 left join payments y1 on (o1.id=y1.orders_id) ' +
    '          left join users u1 on (o1.userscreated_id=u1.id) ' +
    '          left join clients c1 on (o1.clients_id=c1.id) ' +
    'where ' +
    'o1.customers_id=$1 ' +
    'and ' +
    'o1.dateexpired is null ' +
    'and ' +
    'o1.id=$2',
    [
      world.cn.custid,
      __.sanitiseAsBigInt(world.orderid)
    ],
    'select ' +
    'od1.products_id productid,' +
    'od1.qty,' +
    'od1.price exgst,' +
    'od1.gst,' +
    'od1.price + od1.gst price,' +
    'od1.discount,' +
    'p1.code,' +
    'p1.name,' +
    'p1.uomsize ' +
    'from ' +
    'orderdetails od1 left join products p1 on (od1.products_id=p1.id) ' +
    'where ' +
    'od1.customers_id=$1 ' +
    'and ' +
    'od1.version=$2 ' +
    'and ' +
    'od1.orders_id=$3 ' +
    'order by ' +
    'od1.datecreated',
    function(err, result1, result2)
    {
      if (!err)
      {
        if (__.isNull(result1))
          world.spark.emit(world.eventname, {rc: global.errcode_nodata, msg: global.text_nodata, fguid: world.fguid, pdata: world.pdata});
        else
          world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, order: result1, products: result2.rows, pdata: world.pdata});
      }
    },
    function(f1result)
    {
      var binds =
      [
        world.cn.custid,
        f1result.rows[0].activeversion,
        __.sanitiseAsBigInt(world.orderid)
      ];

      return binds;
    }
  );
}

function POSNewCust(world)
{
  global.modhelpers.doSimpleFunc2Tx
  (
    world,
    global.modconfig.doNextClientNo,
    global.modclients.doNewClient,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, clientid: world.clientid, code: world.code, datecreated: result.datecreated, usercreated: result.usercreated, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'superfundcreated', {clientid: world.clientid, code: world.code, datecreated: result.datecreated, usercreated: result.usercreated}, world.spark.id);
        global.pr.sendToRoom(global.custchannelprefix + world.cn.custid, 'configsaved', {});
      }
    },
    function(f1result)
    {
      world.code = f1result.clientno;
      world.issupplier = false;
      world.isclient = true;
      world.isactive = true;
      world.country = global.config.defaults.defaultcountry;
    }
  );
}

function POSSalesTotal(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'sum(p1.amount) total,' +
    'p1.paymenttype ' +
    'from ' +
    'payments p1 ' +
    'where ' +
    'p1.customers_id=$1 ' +
    'and ' +
    'p1.locations_id=$2 ' +
    'and ' +
    'p1.datecreated between $3 and $4 ' +
    'group by ' +
    'p1.paymenttype',
    [
      world.cn.custid,
      __.sanitiseAsBigInt(global.config.pos.locationid_warehouse),
      __.sanitiseAsDate(world.datefrom),
      __.sanitiseAsDate(world.dateto)
    ],
    function(err, result)
    {
      if (!err)
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
    }
  );
}

// *******************************************************************************************************************************************************************************************
// Public functions
module.exports.POSGetProduct = POSGetProduct;
module.exports.POSGenBarcode = POSGenBarcode;
module.exports.POSNewQuote = POSNewQuote;
module.exports.POSQuote = POSQuote;
module.exports.POSCashSale = POSCashSale;
module.exports.POSCreditSale = POSCreditSale;
module.exports.POSSplitSale = POSSplitSale;
module.exports.POSSearchSale = POSSearchSale;
module.exports.POSLoadSale = POSLoadSale;
module.exports.POSNewCust = POSNewCust;
module.exports.POSSalesTotal = POSSalesTotal;
