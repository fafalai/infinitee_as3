// *******************************************************************************************************************************************************************************************
// Internal functions
function doExcelToPDF(xlsx, exportaspdf)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      if (exportaspdf)
      {
        var p = path.parse(xlsx.fullpath);
        var pdf = path.join(p.dir, p.name) + global.config.defaults.defaultPDFExtension;
        var cmd = global.config.apps.libreoffice + ' --headless --convert-to pdf --outdir ' + p.dir + "/" + xlsx.basename;
        global.ConsoleLog(cmd);
        global.ConsoleLog(global.exec);
        global.exec
        (
          cmd,
          function(err, stdout, stderr)
          {
            if (!err)
            {
              // Did conversion complete?
              if (fs.existsSync(pdf))
                resolve(xlsx);
              else
                resolve(null);
            }
            else
                reject(err);
          }
        );
      }
      else
        resolve(xlsx);
    }
  );
  return promise;
};

function doGetTimeClockPeriodFromToday(paystartdow)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      var today = new global.moment().subtract(1, 'day');
      var lastpayday = new global.moment().subtract(1, 'day');

      // Go back one day at a time until previous pay day (which could be today if today is pay day)...
      while (lastpayday.weekday() != paystartdow)
        lastpayday = lastpayday.subtract(1, 'day');

      //resolve({today: new global.moment('2017-09-27 23:59:59'), lastpayday: new global.moment('2017-09-27 00:00:00')});
      resolve({today: today, lastpayday: lastpayday});
    }
  );
  return promise;
}

function doCalcPayrollFromRtap(client, startdate, enddate)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      var dtstart = global.moment(startdate, 'YYYY-MM-DD').hour(0).minute(0).second(0);
      var dtend = global.moment(enddate, 'YYYY-MM-DD').hour(23).minute(59).second(59);
      var dtstartformatted = dtstart.format('YYYY-MM-DD HH:mm:ss');
      var dtendformatted = dtend.format('YYYY-MM-DD HH:mm:ss');

      global.log.info({docalcpayrollfromrtap: true}, 'RTAP data for period: ' + dtstartformatted + ' - ' + dtendformatted);

      client.query
      (
        'select ' +
        'r1.rfid,' +
        'r1.employeeid,' +
        'r1.lastname,' +
        'r1.firstname,' +
        'r1.code,' +
        'r1.starttime,' +
        'r1.endtime,' +
        'r1.dom,' +
        'r1.workhours,' +
        'r1.overtimeallowed ' +
        'from ' +
        'getrtapdata($1,to_timestamp($2,\'YYYY-MM-DD hh24:mi:ss\')::timestamp without time zone,to_timestamp($3,\'YYYY-MM-DD hh24:mi:ss\')::timestamp without time zone) r1 ' +
        'order by ' +
        'r1.lastname,' +
        'r1.firstname,' +
        'r1.starttime',
        [
          global.config.defaults.defaultcustomerid,
          dtstartformatted,
          dtendformatted
        ],
        function(err, result)
        {
          if (!err)
          {
            var emptotals = [];

            result.rows.forEach
            (
              function(r)
              {
                var starttime = new global.moment(r.starttime);
                var endtime = new global.moment(r.endtime);
                var dow = starttime.weekday();

                r.name = r.lastname + ', ' + r.firstname;

                r.starttime = starttime.format('YYYY-MM-DD HH:mm:ss');
                r.endtime = endtime.format('YYYY-MM-DD HH:mm:ss');
                r.downame = starttime.format('ddd');

                // They only tapped once - either on way in or on way out...
                if (starttime.isSame(endtime))
                {
                  r.actualstarttime = starttime;
                  r.actualendtime = endtime;
                  r.nminutes = 0;
                  r.ominutes = 0;
                  r.subminutes = '';
                }
                else if (!__.isBlank(r.workhours))
                {
                  global.safejsonparse
                  (
                    r.workhours,
                    function(err, robj)
                    {
                      if (!err)
                      {
                        // Working hours for this day for this employee...
                        var hours_temp = robj[dow];
                        // Convert to moment() type - we only want the time portion anyway, ignore date...
                        var hours =
                        {
                          start: new global.moment(hours_temp.start, 'HH:mm'),
                          finish: new global.moment(hours_temp.finish, 'HH:mm')
                        };
                        // Breakdown the timestamp to start hour/minute and end hour/minute so we can compare to work hours...
                        var hstart = starttime.hour();
                        var mstart = starttime.minute();
                        var hend = endtime.hour();
                        var mend = endtime.minute();
                        var workhstart = hours.start.hour();
                        var workmstart = hours.start.minute();
                        var workhend = hours.finish.hour();
                        var workmend = hours.finish.minute();
                        // Total normal hours and overtime hours...
                        var nminutes = 0;
                        var ominutes = 0;
                        // Some rules...
                        // if they start BEFORE official start time, use official start time;
                        // If they start AFTER official start time, use that...
                        if (hstart < workhstart)
                        {
                          starttime.hour(workhstart);
                          starttime.minute(workmstart);
                          hstart = workhstart;
                          mstart = workmstart;
                        }
                        // No overtime allowed...
                        if (r.overtimeallowed == 0)
                        {
                          // If they wok extra, ignore...
                          if ((hend > workhend) || ((hend == workhend) && (mend > workmend)))
                          {
                            endtime.hour(workhend);
                            endtime.minute(workmend);
                            hend = workhend;
                            mend = workmend;
                          }
                        }
                        // Calculate total #minutes worked
                        var normalminutes = hours.finish.diff(hours.start, 'minutes');
                        var totalminutes = endtime.diff(starttime, 'minutes') - global.config.env.lunchbreak;

                        if (totalminutes > normalminutes)
                        {
                          nminutes = normalminutes;
                          ominutes = totalminutes - normalminutes;
                        }
                        else
                          nminutes = totalminutes;

                        r.actualstarttime = starttime;
                        r.actualendtime = endtime;
                        r.nminutes = nminutes;
                        r.ominutes = ominutes;
                        r.subminutes = __.humaniseTimeInMinutes(global.moment.duration(nminutes + ominutes, 'minutes').asMinutes());
                      }
                    }
                  );
                }
                else
                {
                  var nminutes = endtime.diff(starttime, 'minutes');
                  // No work hours listed, so flexi-time - use the hours as is...
                  r.actualstarttime = r.starttime;
                  r.actualendtime = r.endtime;
                  r.nminutes = nminutes;
                  r.ominutes = 0;
                  r.subminutes = __.humaniseTimeInMinutes(global.moment.duration(nminutes, 'minutes').asMinutes());
                }
              }
            );
            // Now add up totals...
            result.rows.forEach
            (
              function(r)
              {
                var emp = emptotals.filter
                (
                  function(e)
                  {
                    return e.employeeid == r.employeeid;
                  }
                );

                if (__.isNull(emp) || (emp.length == 0))
                  emptotals.push({employeeid: r.employeeid, name: r.name, code: r.code, normal: r.nminutes, overtime: r.ominutes, total: r.nminutes + r.ominutes});
                else
                {
                  emp[0].normal += r.nminutes;
                  emp[0].overtime += r.ominutes;
                  emp[0].total += (r.nminutes + r.ominutes);
                }
              }
            );

            emptotals.forEach
            (
              function(e)
              {
                /*
                e.normal = global.moment.duration(e.normal, 'minutes').humanize();
                e.overtime = global.moment.duration(e.overtime, 'minutes').humanize();
                e.total = global.moment.duration(e.total, 'minutes').humanize();
                */
                e.normal = __.humaniseTimeInMinutes(global.moment.duration(e.normal, 'minutes').asMinutes());
                e.overtime = __.humaniseTimeInMinutes(global.moment.duration(e.overtime, 'minutes').asMinutes());
                e.total = __.humaniseTimeInMinutes(global.moment.duration(e.total, 'minutes').asMinutes());
              }
            );

            resolve({tags: result.rows, emp: emptotals, datefrom: dtstartformatted, dateto: dtendformatted});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doSetLastEmailNo(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'insert into emails (customers_id,orders_id,copyno,recipients,subject,body,userscreated_id,datesent) values ($1,$2,$3,$4,$5,$6,$7,now()) returning id,datecreated',
        [
          world.cn.custid,
          __.sanitiseAsBigInt(world.orderid),
          world.copyno,
          __.sanitiseAsString(world.recipients),
          __.sanitiseAsString(world.subject),
          __.sanitiseAsString(world.message),
          world.cn.userid
        ],
        function(err, result)
        {
          if (!err)
          {
            var emailid = result.rows[0].id;
            var datecreated = global.moment(result.rows[0].datecreated).format('YYYY-MM-DD HH:mm:ss');

            resolve({emailid: emailid, datecreated: datecreated, usercreated: world.cn.uname});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doSetLastPrintNo(tx, custid, userid, orderid, copyno)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'insert into prints (customers_id,orders_id,copyno,userscreated_id) values ($1,$2,$3,$4) returning id,datecreated',
        [
          custid,
          __.sanitiseAsBigInt(orderid),
          copyno,
          userid
        ],
        function(err, result)
        {
          if (!err)
          {
            var printid = result.rows[0].id;
            var datecreated = global.moment(result.rows[0].datecreated).format('YYYY-MM-DD HH:mm:ss');

            resolve({printid: printid, datecreated: datecreated});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doGetLastPrintNo(tx, custid, orderid)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'select ' +
        'max(p1.copyno) lastcopyno ' +
        'from ' +
        'prints p1 ' +
        'where ' +
        'p1.customers_id=$1 ' +
        'and ' +
        'p1.orders_id=$2',
        [
          custid,
          __.sanitiseAsBigInt(orderid)
        ],
        function(err, result)
        {
          if (!err)
          {
            var copyno = 1;

            if (result.rows.length == 1)
              copyno = result.rows[0].lastcopyno + 1;
            resolve(copyno);
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doGetLastEmailNo(tx, custid, orderid)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'select ' +
        'max(e1.copyno) lastcopyno ' +
        'from ' +
        'emails e1 ' +
        'where ' +
        'e1.customers_id=$1 ' +
        'and ' +
        'e1.orders_id=$2',
        [
          custid,
          __.sanitiseAsBigInt(orderid)
        ],
        function(err, result)
        {
          if (!err)
          {
            var copyno = 1;

            if (result.rows.length == 1)
              copyno = result.rows[0].lastcopyno + 1;
            resolve(copyno);
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doGetOrderDetails(tx, custid, header)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'select ' +
        'o1.products_id productid,' +
        'o1.price,' +
        'o1.gst,' +
        'o1.qty,' +
        'o1.discount,' +
        'o1.expressfee,' +
        'p1.uomsize,' +
        'p1.uom,' +
        'p1.code productcode,' +
        'p1.name productname ' +
        'from ' +
        'orderdetails o1 left join products p1 on (o1.products_id=p1.id) ' +
        'where ' +
        'o1.customers_id=$1 ' +
        'and ' +
        'o1.orders_id=$2 ' +
        'and ' +
        'o1.version=$3 ' +
        'and ' +
        'o1.dateexpired is null ' +
        'order by ' +
        'o1.datecreated desc',
        [
          custid,
          __.sanitiseAsBigInt(header.orderid),
          header.activeversion
        ],
        function(err, result)
        {
          if (!err)
            resolve(result.rows);
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doGetOrderHeader(tx, custid, orderid)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'select ' +
        'o1.id orderid,' +
        'o1.orders_id parentid,' +
        'o1.clients_id clientid,' +
        'o1.shipto_clients_id shiptoid,' +
        'o1.invoiceto_clients_id invoicetoid,' +
        'o1.quoteno,' +
        'o1.orderno,' +
        'o1.invoiceno,' +
        'o1.pono,' +
        'o1.name ordername,' +
        'o1.accounts_id accountid,' +
        'o1.invoiceto_name invoicetoname,' +
        'o1.invoiceto_address1 invoicetoaddress1,' +
        'o1.invoiceto_address2 invoicetoaddress2,' +
        'o1.invoiceto_city invoicetocity,' +
        'o1.invoiceto_state invoicetostate,' +
        'o1.invoiceto_postcode invoicetopostcode,' +
        'o1.invoiceto_country invoicetocountry,' +
        'o1.shipto_name shiptoname,' +
        'o1.shipto_address1 shiptoaddress1,' +
        'o1.shipto_address2 shiptoaddress2,' +
        'o1.shipto_city shiptocity,' +
        'o1.shipto_state shiptostate,' +
        'o1.shipto_postcode shiptopostcode,' +
        'o1.shipto_country shiptocountry,' +
        'o1.shipto_notes shiptonote,' +
        'o1.numversions,' +
        'o1.activeversion,' +
        'o1.startdate,' +
        'o1.enddate,' +
        'o1.datecompleted,' +
        'o1.invoicedate,' +
        'o1.datecreated,' +
        'o1.datemodified,' +
        'c1.name clientname,' +
        'c1.code clientcode,' +
        'c1.contact1 clientcontact1,' +
        'c1.contact2 clientcontact2,' +
        'c1.acn clientacn,' +
        'c1.abn clientabn,' +
        'c1.hscode clienthscode,' +
        'c1.custcode1 clientcustcode1,' +
        'c1.custcode2 clientcustcode2,' +
        'u1.name usercreated,' +
        'u2.name usermodified ' +
        'from ' +
        'orders o1 left join users u1 on (o1.userscreated_id=u1.id) ' +
        '          left join users u2 on (o1.usersmodified_id=u2.id) ' +
        '          left join clients c1 on (o1.clients_id=c1.id) ' +
        'where ' +
        'o1.customers_id=$1 ' +
        'and ' +
        'o1.id=$2',
        [
          custid,
          __.sanitiseAsBigInt(orderid)
        ],
        function(err, result)
        {
          if (!err && (result.rows.length == 1))
          {
            // JS returns date with TZ info/format, need in ISO format...
            result.rows.forEach
            (
              function(p)
              {
                if (!__.isUN(p.startdate))
                  p.startdate = global.moment(p.startdate).format('YYYY-MM-DD HH:mm');

                if (!__.isUN(p.enddate))
                  p.enddate = global.moment(p.enddate).format('YYYY-MM-DD HH:mm');

                if (!__.isUN(p.datecompleted))
                  p.datecompleted = global.moment(p.datecompleted).format('YYYY-MM-DD HH:mm');

                if (!__.isUN(p.invoicedate))
                  p.invoicedate = global.moment(p.invoicedate).format('YYYY-MM-DD HH:mm');

                if (!__.isUN(p.datemodified))
                  p.datemodified = global.moment(p.datemodified).format('YYYY-MM-DD HH:mm');

                p.datecreated = global.moment(p.datecreated).format('YYYY-MM-DD HH:mm');
              }
            );
            resolve(result.rows[0]);
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doGetPrintTemplate(tx, type, custid, orderid, clientid, defaulttemplateid)
{
  global.ConsoleLog(defaulttemplateid);
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      var colname = '';
      var templatename = '';

      if (type == global.itype_order_order)
        colname = 'ordertemplates_id';
      else if (type == global.itype_order_invoice)
        colname = 'invoicetemplates_id';
      else if (type == global.itype_order_quote)
        colname = 'quotetemplates_id';
      else
        colname = 'deliverydockettemplates_id';

      //  See if there's an order level template...
      tx.query
      (
        'select ' +
        'p1.id templateid,' +
        'p1.name ' +
        'from ' +
        'orders o1 left join printtemplates p1 on (o1.' + colname + '=p1.id) ' +
        'where ' +
        'o1.customers_id=$1 ' +
        'and ' +
        'o1.id=$2',
        [
          custid,
          __.sanitiseAsBigInt(orderid)
        ],
        function(err, result)
        {
          if (!err)
          {
            if ((result.rows.length == 0) || __.isNull(result.rows[0].templateid))
            {
              // Try client level template...
              tx.query
              (
                'select ' +
                'p1.id templateid,' +
                'p1.name ' +
                'from ' +
                'clients c1 left join printtemplates p1 on (c1.' + colname + '=p1.id) ' +
                'where ' +
                'c1.customers_id=$1 ' +
                'and ' +
                'c1.id=$2',
                [
                  custid,
                  __.sanitiseAsBigInt(clientid)
                ],
                function(err, result)
                {
                  if (!err)
                  {
                    if ((result.rows.length == 0) || __.isNull(result.rows[0].templateid))
                    {
                      // Use system template...
                      tx.query
                      (
                        'select ' +
                        'p1.name ' +
                        'from ' +
                        'printtemplates p1 ' +
                        'where ' +
                        'p1.customers_id=$1 ' +
                        'and ' +
                        'p1.id=$2',
                        [
                          custid,
                          __.sanitiseAsBigInt(defaulttemplateid)
                        ],
                        function(err, result)
                        {
                          if (!err)
                          {
                            if ((result.rows.length > 0) && !__.isNull(result.rows[0].name))
                            {
                              global.ConsoleLog("have template");
                              var templatename = global.path.join(__dirname, global.config.folders.templates + defaulttemplateid + '_' + result.rows[0].name);
                              resolve(templatename);
                            }
                            else
                            {
                              global.ConsoleLog("no template");
                              reject({message: global.text_noprinttemplate});
                            }
                          }
                          else
                            reject(err);
                        }
                      );
                    }
                    else
                    {
                      templatename = global.path.join(__dirname, global.config.folders.templates + result.rows[0].templateid + '_' + result.rows[0].name);
                      resolve(templatename);
                    }
                  }
                  else
                    reject(err);
                }
              );
            }
            else
            {
              templatename = global.path.join(__dirname, global.config.folders.templates + result.rows[0].templateid + '_' + result.rows[0].name);
              resolve(templatename);
            }
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doGenOrder(tx, type, custid, header, details, templatename, uname)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      fs.readFile
      (
        templatename,
        function(err, data)
        {
          if (!err)
          {
            var sheetno = 1;
            var template = new global.xlwriter(data);
            var blob = null;
            var products = [];
            var totalinc = __.toBigNum(0.0);
            var totalex = __.toBigNum(0.0);
            var totalgst = __.toBigNum(0.0);
            var foldername = '';
            var no = ''; 
            var filename = '';
            var lineno = 1;

            if (type == global.type_quote)
            {
              foldername = global.path.join(__dirname, global.config.folders.quotes + custid);
              no = header.quoteno;
            }
            else if (type == global.type_order)
            {
              foldername = global.path.join(__dirname, global.config.folders.orders + custid);
              no = header.orderno;
            }
            else
            {
              foldername = global.path.join(__dirname, global.config.folders.invoices + custid);
              no = header.invoiceno;
            }

            filename = no + global.config.defaults.defaultXLExtension;

            details.forEach
            (
              function(r)
              {
                var p = __.toBigNum(r.price);
                var g = __.toBigNum(r.gst);
                var q = __.toBigNum(r.qty);
                var d = __.toBigNum(r.discount);
                var f = __.toBigNum(r.expressfee);
                var t1 = p.times(q);
                var t2 = g.times(q);
                var rp = p.plus(g);

                // Discount and express fee...
                // +GST
                var subd = t1.times(d).div(100.0);
                var subf = t1.times(f).div(100.0);
                // -GST
                var subgstd = t2.times(d).div(100.0);
                var subgstf = t2.times(f).div(100.0);

                var subgst = t2.plus(subgstf).minus(subgstd);
                var subex = t1.plus(subf).minus(subd);
                var subinc = subgst.plus(subex);

                rp = rp.minus(rp.times(d).div(100.0)).plus(rp.times(f).div(100.0));

                /*
                console.log( __.formatnumber(p, 4));
                console.log( __.formatnumber(q, 4));
                console.log( __.formatnumber(qu, 4));

                console.log( __.formatnumber(subgst, 4));
                console.log( __.formatnumber(subex, 4));
                console.log( __.formatnumber(subinc, 4));

                console.log( __.formatnumber(subgst, 2));
                console.log( __.formatnumber(subex, 2));
                console.log( __.formatnumber(subinc, 2));
                */

                totalgst = totalgst.plus(subgst);
                totalex = totalex.plus(subex);
                totalinc = totalinc.plus(subinc);

                products.push
                (
                  {
                    lineno: lineno++,
                    code: r.productcode,
                    name: r.productname,
                    unit: r.uom,
                    price: __.niceformatnumber(r.price, 2),
                    gst: __.niceformatnumber(r.gst, 2),
                    qty: __.niceformatnumber(r.qty, 2),
                    discount: __.niceformatnumber(r.discount, 2),
                    expressfee: __.niceformatnumber(r.expressfee, 2),
                    subtotal: __.niceformatnumber(subex, 2),
                    subtotalgst: __.niceformatnumber(subgst, 2),
                    // Retail means include GST in displaus..
                    retailprice: __.niceformatnumber(rp, 2),
                    retailsubtotal: __.niceformatnumber(subinc, 2)
                  }
                );
              }
            );

            var values =
            {
              orderinvoiceno: __.sanitiseAsString(header.invoiceno),
              orderorderno: __.sanitiseAsString(header.orderno),
              orderquoteno: __.sanitiseAsString(header.quoteno),
              custpo: __.sanitiseAsString(header.pono),
              orderinvoicedate: global.moment(__.sanitiseAsString(header.invoicedate)).format('LL'),
              orderstartdate: global.moment(__.sanitiseAsString(header.datecreated)).format('LL'),

              custname: __.isBlank(header.ordername) ? __.sanitiseAsString(header.clientname) : __.sanitiseAsString(header.ordername),
              custvendorcode: __.sanitiseAsString(header.clientcode),

              custcontact1: __.sanitiseAsString(header.clientcontact1),
              custcontact2: __.sanitiseAsString(header.clientcontact2),

              custshipnotes: '',

              custaddress1: __.sanitiseAsString(header.invoicetoaddress1),
              custaddress2: __.sanitiseAsString(header.invoicetoaddress2),
              custcity: __.sanitiseAsString(header.invoicetocity),
              custpostcode: __.sanitiseAsString(header.invoicetopostcode),
              custstate: __.sanitiseAsString(header.invoicetostate),
              custcountry: __.sanitiseAsString(header.invoicetocountry),

              custshipaddress1: __.isUNB(header.shiptoaddress1) ? __.sanitiseAsString(header.invoicetoaddress1) : __.sanitiseAsString(header.shiptoaddress1),
              custshipaddress2: __.isUNB(header.shiptoaddress2) ? __.sanitiseAsString(header.invoicetoaddress2) : __.sanitiseAsString(header.shiptoaddress2),
              custshipcity: __.isUNB(header.shiptocity) ? __.sanitiseAsString(header.invoicetocity) : __.sanitiseAsString(header.shiptocity),
              custshippostcode: __.isUNB(header.shiptopostcode) ? __.sanitiseAsString(header.invoicetopostcode) : __.sanitiseAsString(header.shiptopostcode),
              custshipstate: __.isUNB(header.shiptostate) ? __.sanitiseAsString(header.invoicetostate) : __.sanitiseAsString(header.shiptostate),
              custshipcountry: __.isUNB(header.shiptocountry) ? __.sanitiseAsString(header.invoicetocountry) : __.sanitiseAsString(header.shiptocountry),

              custacn: __.sanitiseAsString(header.clientacn),
              custabn: __.sanitiseAsString(header.clientabn),
              custhscode: __.sanitiseAsString(header.clienthscode),
              custcustcode1: __.sanitiseAsString(header.clientcustcode1),
              custcustcode2: __.sanitiseAsString(header.clientcustcode2),

              preparedby: uname,
              createdby: __.sanitiseAsString(header.usercreated),
              orderrevno: header.activeversion,
              orderrevdate: __.sanitiseAsString(header.datemodified),

              ordertotal: __.niceformatnumber(totalex, 2),
              orderdeliveryfee: '',
              ordergstamount: __.niceformatnumber(totalgst, 2),
              orderincgst: __.niceformatnumber(totalinc, 2),
              orderapplied: '',
              ordergrandtotal: __.niceformatnumber(totalinc, 2),

              product: products
            };

            //console.log(values);

            template.substitute(sheetno, values);
            blob = template.generate();

            ensureFolderExists
            (
              foldername,
              0775,
              function(err)
              {
                if (!err)
                {
                  fs.writeFile
                  (
                    foldername + '/' + filename,
                    blob,
                    'binary',
                    function(err)
                    {
                      if (!err)
                        resolve({orderno: header.orderno, invoiceno: header.invoiceno, quoteno: header.quoteno, basename: filename, fullpath: foldername + '/' + filename});
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
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doSendFile(res, custid, no, folder, exportaspdf)
{
  var foldername = global.path.join(__dirname, folder + custid);
  var mimetype = '';
  var filename = no;

  if (exportaspdf)
  {
    filename += global.config.defaults.defaultPDFExtension;
    mimetype = global.config.mime.pdf;
  }
  else
  {
    filename += global.config.defaults.defaultXLExtension;
    mimetype = global.config.mime.excel;
  }

  res.setHeader('Content-disposition', 'attachment; filename=' + filename);
  res.setHeader('Content-type', mimetype);
  res.sendFile(foldername + '/' + filename);
}

function doPrintOrders(tx, type, templateid, orders, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      var calls = [];
      var count = orders.length;
      global.ConsoleLog("the number of orders need to pring is: " + count);  
      if(count == 1)
      {
        global.ConsoleLog("pring one order, use the standard one");
        orders.forEach
        (
          function(orderid)
          {
            calls.push
            (
              function(callback)
              {
                var header = null;
                var details = null;
                var print = null;
  
                doGetOrderHeader(tx, world.cn.custid, orderid).then
                (
                  function(result)
                  {
                    header = result;
                    return doGetOrderDetails(tx, world.cn.custid, header);
                  }
                ).then
                (
                  function(result)
                  {
                    details = result;
                    return doGetLastPrintNo(tx, world.cn.custid, orderid);
                  }
                ).then
                (
                  function(copyno)
                  {
                    world.copyno = copyno;
                    return doSetLastPrintNo(tx, world.cn.custid, world.cn.userid, orderid, copyno);
                  }
                ).then
                (
                  function(result)
                  {
                    print = result;
                    return doGetPrintTemplate(tx, type, world.cn.custid, header.orderid, header.clientid, templateid);
                  }
                ).then
                (
                  function(result)
                  {
                    return doGenOrder(tx, type, world.cn.custid, header, details, result, world.cn.uname);
                  }
                ).then
                (
                  function(result)
                  {
                    if (world.custconfig.exportaspdf)
                      world.spark.emit(global.eventinfo, {rc: global.errcode_none, msg: 'Output generated, now converting to PDF', pdata: world.pdata});
  
                    return doExcelToPDF(result, world.custconfig.exportaspdf);
                  }
                ).then
                (
                  function(xlsx)
                  {
                    callback(null, xlsx);
                  }
                ).then
                (
                  null,
                  function(err)
                  {
                    callback(err);
                  }
                )
              }
            );
          }
        );

      }
      else
      {
        global.ConsoleLog("pring more than one orders, use the other one");
        orders.forEach
        (
          function(orderid)
          {
            calls.push
            (
              function(callback)
              {
                var header = null;
                var details = null;
                var print = null;
  
                doGetOrderHeader(tx, world.cn.custid, orderid).then
                (
                  function(result)
                  {
                    header = result;
                    return doGetOrderDetails(tx, world.cn.custid, header);
                  }
                ).then
                (
                  function(result)
                  {
                    details = result;
                    return doGetLastPrintNo(tx, world.cn.custid, orderid);
                  }
                ).then
                (
                  function(copyno)
                  {
                    world.copyno = copyno;
                    return doSetLastPrintNo(tx, world.cn.custid, world.cn.userid, orderid, copyno);
                  }
                ).then
                // (
                //   function(result)
                //   {
                //     print = result;
                //     return doGetPrintTemplate(tx, type, world.cn.custid, header.orderid, header.clientid, templateid);
                //   }
                // ).then
                (
                  function(result)
                  {
                    return doGenOrders(tx, type, world.cn.custid, header, details, world.cn.uname,count,world);
                  }
                ).then
                (
                  function(result)
                  {
                    global.ConsoleLog(result);
                    //global.ConsoleLog(callback);
                    if(result.completed == 0)
                    {
                      callback(null, result);
                    }
                    else
                    {
                      resolve (result);
                    }
                    //return result;
                  }
                ).then
                (
                  null,
                  function(err)
                  {
                    callback(err);
                    return err;
                  }
                )
              }
            );
          }
        );
      }


      global.async.series
      (
        calls,
        function(err, results)
        {
          if (!err)
            resolve(results);
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}  

function doEmailOrder(tx, type, templateid, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      var header = null;
      var details = null;
      var email = null;

      doGetOrderHeader(tx, world.cn.custid, world.orderid).then
      (
        function(result)
        {
          header = result;
          return doGetOrderDetails(tx, world.cn.custid, header);
        }
      ).then
      (
        function(result)
        {
          details = result;
          return doGetLastEmailNo(tx, world.cn.custid, world.orderid);
        }
      ).then
      (
        function(result)
        {
          world.copyno = result;
          return doSetLastEmailNo(tx, world);
        }
      ).then
      (
        function(result)
        {
          email = result;
          return doGetPrintTemplate(tx, world.cn.custid, type, header.orderid, header.clientid, templateid);
        }
      ).then
      (
        function(result)
        {
          return doGenOrder(tx, type, world.cn.custid, header, details, result, world.cn.uname);
        }
      ).then
      (
        function(result)
        {
          var transporter = createSMTPTransport();

          transporter.sendMail
          (
            {
              from: global.config.smtp.returnmail,
              to: world.recipients,
              subject: world.subject + ' - Copy #' + world.copyno,
              html: world.message,
              attachments:
              [
                {
                  filename: result.basename,
                  path: result.fullpath
                }
              ]
            },
            function(err, info)
            {
              if (!err)
                resolve(email);
              else
                reject(err);
            }
          );
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

var totalOrderList = [];
var orderProductTotal = 0;
var accumulatedOrders = 0;
var order_productstotal = [];
function doGenOrders(tx, type,custid, header, details, uname,orderstotal,world)
{
    //global.ConsoleLog("order total " + orderstotal);
    var promise = new global.rsvp.Promise
    (
      function(resolve, reject)
      {
        // global.ConsoleLog('resolve');
        // global.ConsoleLog(resolve);
        var lineno = 1;
        var now =  moment().format("MM-DD-YYYY");
            
        var products = [];
        var totalinc = __.toBigNum(0.0);
        var totalex = __.toBigNum(0.0);
        var totalgst = __.toBigNum(0.0);
        var foldername = '';
        
        var no = ''; 
        var filename;
        if (type == global.type_quote)
        {
          foldername = global.path.join(__dirname, global.config.folders.quotes + custid);
          no = header.quoteno;
          filename = "AllQuotes_"+ now + global.config.defaults.defaultXLExtension;

        }
        else if (type == global.type_order)
        {
          foldername = global.path.join(__dirname, global.config.folders.orders + custid);
          no = header.orderno;
          filename = "AllOrders_"+ now + global.config.defaults.defaultXLExtension;

        }
        else
        {
          foldername = global.path.join(__dirname, global.config.folders.invoices + custid);
          no = header.invoiceno;
          filename = "AllInvoices" + global.config.defaults.defaultXLExtension;

        }
        var path = foldername + '/' + filename;
  
  
         details.forEach
         (
           function(r)
           {
             var p = __.toBigNum(r.price);
             var g = __.toBigNum(r.gst);
             var q = __.toBigNum(r.qty);
             var d = __.toBigNum(r.discount);
             var f = __.toBigNum(r.expressfee);
             var t1 = p.times(q);
             var t2 = g.times(q);
  
             
             // Discount and express fee...
             // +GST
             var subd = t1.times(d).div(100.0);
             var subf = t1.times(f).div(100.0);
             // -GST
             var subgstd = t2.times(d).div(100.0);
             var subgstf = t2.times(f).div(100.0);
  
             var subgst = t2.plus(subgstf).minus(subgstd);
             var subex = t1.plus(subf).minus(subd);
             var subinc = subgst.plus(subex);
  
             /*
             console.log( __.formatnumber(p, 4));
             console.log( __.formatnumber(q, 4));
             console.log( __.formatnumber(qu, 4));
  
             console.log( __.formatnumber(subgst, 4));
             console.log( __.formatnumber(subex, 4));
             console.log( __.formatnumber(subinc, 4));
  
             console.log( __.formatnumber(subgst, 2));
             console.log( __.formatnumber(subex, 2));
             console.log( __.formatnumber(subinc, 2));
             */
  
             totalgst = totalgst.plus(subgst);
             totalex = totalex.plus(subex);
             totalinc = totalinc.plus(subinc);
  
             /*
             products.push
             (
               {
                 lineno: lineno++,
                 code: d.productcode,
                 name: d.productname,
                 price: (__.niceformatnumber(r.price, 2)),
                 gst: (__.niceformatnumber(r.gst, 2)),
                 qty: __.niceformatnumber(r.qty, 2),
                 discount: (__.niceformatnumber(r.discount, 2)),
                 expressfee: (__.niceformatnumber(r.expressfee, 2)),
                 subtotal: (__.niceformatnumber(subex, 2)),
                 subtotalgst: (__.niceformatnumber(subgst, 2))
               }
             );
             */
             products.push
             (
               {
                 lineno: lineno++,
                 code: r.productcode,
                 name: r.productname,
                 price: Number((__.formatnumber(r.price, 2))),
                 gst: Number((__.formatnumber(r.gst, 2))),
                 qty: Number(__.formatnumber(r.qty, 2)),
                 discount: Number((__.formatnumber(r.discount, 2))),
                 expressfee: Number((__.formatnumber(r.expressfee, 2))),
                 subtotal: Number((__.formatnumber(subex, 2))),
                 subtotalgst: Number((__.formatnumber(subgst, 2)))
               }
             );
           }
         );
  
         var values =
         {
           orderinvoiceno: __.sanitiseAsString(header.invoiceno),
           orderorderno: __.sanitiseAsString(header.orderno),
           custpo: __.sanitiseAsString(header.pono),
           orderinvoicedate: global.moment(__.sanitiseAsString(header.invoicedate)).format('LL'),
           orderstartdate: global.moment(__.sanitiseAsString(header.datecreated)).format('LL'),
  
           custname: __.isBlank(header.ordername) ? __.sanitiseAsString(header.clientname) : __.sanitiseAsString(header.ordername),
           custvendorcode: __.sanitiseAsString(header.clientcode),
  
           custcontact1: __.sanitiseAsString(header.clientcontact1),
           custcontact2: __.sanitiseAsString(header.clientcontact2),
  
           custshipnotes: '',
  
           custaddress1: __.sanitiseAsString(header.invoicetoaddress1),
           custaddress2: __.sanitiseAsString(header.invoicetoaddress2),
           custcity: __.sanitiseAsString(header.invoicetocity),
           custpostcode: __.sanitiseAsString(header.invoicetopostcode),
           custstate: __.sanitiseAsString(header.invoicetostate),
           custcountry: __.sanitiseAsString(header.invoicetocountry),
  
           custshipaddress1: __.sanitiseAsString(header.shiptoaddress1),
           custshipaddress2: __.sanitiseAsString(header.shiptoaddress2),
           custshipcity: __.sanitiseAsString(header.shiptocity),
           custshippostcode: __.sanitiseAsString(header.shiptopostcode),
           custshipstate: __.sanitiseAsString(header.shiptostate),
           custshipcountry: __.sanitiseAsString(header.shiptocountry),
  
           custacn: __.sanitiseAsString(header.clientacn),
           custabn: __.sanitiseAsString(header.clientabn),
           custhscode: __.sanitiseAsString(header.clienthscode),
           custcustcode1: __.sanitiseAsString(header.clientcustcode1),
           custcustcode2: __.sanitiseAsString(header.clientcustcode2),
  
           prepearedby: __.sanitiseAsString(uname),
           orderrevno: header.activeversion,
           orderrevdate: __.sanitiseAsString(header.datemodified),
  
           // ordertotal: __.niceformatnumber(totalex, 2),
           ordertotal: Number(__.formatnumber(totalex, 2)),
           orderdeliveryfee: 0,
           ordergstamount: Number(__.formatnumber(totalgst, 2)),
           orderincgst: Number(__.formatnumber(totalinc, 2)),
           orderapplied: '',
           ordergrandtotal: Number(__.formatnumber(totalinc, 2)),
  
           product: products
         };
  
         if(__.isNull(__.sanitiseAsString(header.invoicedate)))
         {
           values.orderinvoicedate = '';
         }
  
         delete values.product;
         for(var i = 0;i<products.length;i++)
         {
            totalOrderList.push((Object.assign(values,products[i])));
         }
  
         order_productstotal.push(products.length);
  
         accumulatedOrders = accumulatedOrders + 1;
         //global.ConsoleLog(accumulatedOrders);
        
        
         if(accumulatedOrders == orderstotal)
         {
           
           //global.ConsoleLog(now);
           //global.ConsoleLog(totalOrderList);
         
  
          global.ConsoleLog("we have all the orders in the list, can put them in the workbook");
          ensureFolderExists
          (
             foldername,
             0775,
             function(err)
             {
               if (!err)
               {
                 
                   //need to create the order xlsx first
                   var workbook = new global.exceljs.Workbook();
                   var worksheet = workbook.addWorksheet('All Orders');
                   worksheet.views = [{state:'normal'}];
                   worksheet.pageSetup.orientation = 'landscape';
                   worksheet.pageSetup.fitToPage = true;
                   worksheet.pageSetup.pageOrder = 'overThenDown';
                   worksheet.pageSetup.printTitlesRow = '1:37';
                   worksheet.pageSetup.fitToPage = true;
                   worksheet.pageSetup.fitToHeight = 5;
                   worksheet.pageSetup.fitToWidth = 4;
                   worksheet.pageSetup.paperSize = 9;
                   //worksheet.properties.defaultRowHeight = 34;
                  //  worksheet.pageSetup.showGridLines = true;
                  //  worksheet.views.showGridLines = true;
                   worksheet.views = [{state: 'frozen', xSplit: 2, ySplit: 2}];
                   worksheet.mergeCells('AB1', 'AK1');
                   worksheet.mergeCells('A1','A2');
                   worksheet.mergeCells('B1','B2');
                   worksheet.mergeCells('C1','C2');
                   worksheet.mergeCells('D1','D2');
                   worksheet.mergeCells('E1','E2');
                   worksheet.mergeCells('F1','F2');
                   worksheet.mergeCells('G1','G2');
                   worksheet.mergeCells('H1','H2');
                   worksheet.mergeCells('I1','I2');
                   worksheet.mergeCells('J1','J2');
                   worksheet.mergeCells('K1','K2');
                   worksheet.mergeCells('L1','L2');
                   worksheet.mergeCells('M1','M2');
                   worksheet.mergeCells('N1','N2');
                   worksheet.mergeCells('O1','O2');
                   worksheet.mergeCells('P1','P2');
                   worksheet.mergeCells('Q1','Q2');
                   worksheet.mergeCells('R1','R2');
                   worksheet.mergeCells('S1','S2');
                   worksheet.mergeCells('T1','T2');
                   worksheet.mergeCells('U1','U2');
                   worksheet.mergeCells('V1','V2');
                   worksheet.mergeCells('W1','W2');
                   worksheet.mergeCells('X1','X2');
                   worksheet.mergeCells('Y1','Y2');
                   worksheet.mergeCells('Z1','Z2');
                   worksheet.mergeCells('AA1','AA2');
                   worksheet.mergeCells('AL1','AL2');
                   worksheet.mergeCells('AM1','AM2');
                   worksheet.mergeCells('AN1','AN2');
                   worksheet.mergeCells('AO1','AO2');
                   worksheet.mergeCells('AP1','AP2');
                   worksheet.mergeCells('AQ1','AQ2');
                   worksheet.mergeCells('AR1','AR2');
                   worksheet.mergeCells('AS1','AS2');
                   worksheet.mergeCells('AT1','AT2');
                  
                   
  
                   worksheet.columns = [
                     {header: 'Order Invoice No',key:'orderinvoiceno',width:20,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Order No',key:'orderorderno',width:15,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Custpo',key:'custpo',width:15,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Order Invoice Date',key:'orderinvoicedate',width:22,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Order Start Date',key:'orderstartdate',width:22,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
    
                     {header: 'Name',key:'custname',width:20,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Code',key:'custvendorcode',width:20,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Contact 1',key:'custcontact1',width:30,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Contact 2',key:'custcontact2',width:30,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Ship Notes',key:'custshipnotes',width:30,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
    
                     {header: 'Address 1',key:'custaddress1',width:30,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Address 2',key:'custaddress2',width:30,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'City',key:'custcity',width:20,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Postcode',key:'custpostcode',width:15,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'State',key:'custstate',width:15,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Country',key:'custcountry',width:15,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
    
  
                     {header: 'Shipping Address 1',key:'custshipaddress1',width:30,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Shipping Address 2',key:'custshipaddress2',width:30,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Shipping City',key:'custshipcity',width:20,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Shipping Postcode',key:'custshippostcode',width:15,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Shipping State',key:'custshipstate',width:15,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Shipping Country',key:'custshipcountry',width:15,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
  
                     {header: 'ACN',key:'custacn',width:30,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'ABN',key:'custabn',width:30,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'custhscode',key:'custhscode',width:30,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'custcustcode1',key:'custcustcode1',width:30,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'custcustcode2',key:'custcustcode2',width:30,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
    
                    //  {header: 'Products',key:'product',width:50,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
  
                     {header: 'lineno',key:'lineno',width:10,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'code',key:'code',width:20,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'name',key:'name',width:20,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'price',key:'price',width:10,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'},numFmt:'"$"#,##0.00;[Red]\-"$"#,##0.00'}},
                     {header: 'gst',key:'gst',width:10,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'},numFmt:'"$"#,##0.00;[Red]\-"$"#,##0.00'}},
                     {header: 'qty',key:'qty',width:12,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'},numFmt:'#,##0.00_);[Red](#,##0.00)'}},
  
                     {header: 'discount',key:'discount',width:10,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'},numFmt:'"$"#,##0.00;[Red]\-"$"#,##0.00'}},
                     {header: 'expressfee',key:'expressfee',width:15,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'},numFmt:'"$"#,##0.00;[Red]\-"$"#,##0.00'}},
                     {header: 'subtotal',key:'subtotal',width:20,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'},numFmt:'"$"#,##0.00;[Red]\-"$"#,##0.00'}},
                     {header: 'subtotalgst',key:'subtotalgst',width:15,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'},numFmt:'"$"#,##0.00;[Red]\-"$"#,##0.00'}},
  
                     {header: 'Total',key:'ordertotal',width:20,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'},numFmt:'"$"#,##0.00;[Red]\-"$"#,##0.00'}},
                     {header: 'Dilvery Fee',key:'orderdeliveryfee',width:15,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'},numFmt:'"$"#,##0.00;[Red]\-"$"#,##0.00'}},
                     {header: 'GST Amount',key:'ordergstamount',width:15,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'},numFmt:'"$"#,##0.00;[Red]\-"$"#,##0.00'}},
                     {header: 'Included GST',key:'orderincgst',width:15,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'},numFmt:'"$"#,##0.00;[Red]\-"$"#,##0.00'}},
                     {header: 'Applied',key:'orderapplied',width:10,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Grand Total',key:'ordergrandtotal',width:15,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'},numFmt:'"$"#,##0.00;[Red]\-"$"#,##0.00'}},
  
                     {header: 'Prepared By',key:'prepearedby',width:15,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Version',key:'orderrevno',width:10,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
                     {header: 'Date',key:'orderrevdate',width:30,style: { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}}},
  
  
  
                   ];
  
                  //  worksheet.getRow(1).style = {font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}};
  
                   worksheet.getRow(1).eachCell({includeEmpty:true},function(cell,colNumber){
                       //console.log('Column ' + colNumber + ' = ' + JSON.stringify(cell.value));
                       cell.font = {name: 'Arial Black' };
                       cell.alignment = {wrapText:true,vertical:'middle',horizontal:'center'};
                   });
                    worksheet.getCell('AB1').value = 'Product';
                    worksheet.getCell('AB1').style = { font: { name: 'Arial Black' },alignment:{wrapText:true,vertical:'middle',horizontal:'center'}};
                    worksheet.getCell('AB2').value = 'lieno';
                    worksheet.getCell('AB2').border = {
                      top: {style:'thin'},
                      left: {style:'thin'},
                      bottom: {style:'thin'},
                      right: {style:'thin'}
                    };
                  worksheet.getCell('AC2').value = 'code';
                  worksheet.getCell('AD2').value = 'name';
                  worksheet.getCell('AE2').value= 'price';
                  worksheet.getCell('AF2').value = 'gst';
                  worksheet.getCell('AG2').value = 'qty';
                  worksheet.getCell('AH2').value = 'discount';
                  worksheet.getCell('AI2').value= 'expressfee';
                  worksheet.getCell('AJ2').value= 'subtotal';
                  worksheet.getCell('AK2').value = 'subtotalgst';               
                  worksheet.addRows(totalOrderList);
                  worksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
                        //console.log('Row ' + rowNumber + ' = ' + JSON.stringify(row.values));
                        row.height = 34;
                        if(rowNumber > 2)
                        {
                          row.font = {name:'Comic Sans MS',family:2,size:10,bold:false};
                          row.alignment = {wrapText:true,vertical:'middle',horizontal:'center'};
                          // row.style = {font: {name:'Comic Sans MS',family:2,size:10,bold:false},alignment:{wrapText:true,vertical:'middle',horizontal:'center'}};
                        }
  
                        if(rowNumber == 2)
                        {
                          row.eachCell({ includeEmpty: true },function(cell,colNumber){
                            //console.log('Cell ' + colNumber + ' = ' + cell.value);
                            if (colNumber > 27 && colNumber < 38){
                              cell.border = {
                                top: {style:'thin'},
                                left: {style:'thin'},
                                bottom: {style:'thin'},
                                right: {style:'thin'}
                              }
                            }
                          });
                        }
                        else
                        {
                          row.eachCell({ includeEmpty: true },function(cell,colNumber){
                            //console.log('Cell ' + colNumber + ' = ' + cell.value);
                              cell.border = {
                                top: {style:'thin'},
                                left: {style:'thin'},
                                bottom: {style:'thin'},
                                right: {style:'thin'}
                              }
                          });
                        }
                        
                  });
                  //global.ConsoleLog(order_productstotal);
                  var beginingrow = 3;
                  var beginingindex = 0;
                  var orderinvoicenoCol = worksheet.getColumn('orderinvoiceno');
                  var ordernoCol = worksheet.getColumn('orderorderno');
                  ordernoCol.eachCell({ includeEmpty: true },function(cell,rowNumber){
                    //global.ConsoleLog('rowNumber ' + rowNumber);
                    // global.ConsoleLog('beginingindex ' + beginingindex);
                    if(rowNumber >= 3)
                    {
                      if(beginingrow == rowNumber)
                      {
                        //global.ConsoleLog("beining row " + beginingrow);
                        if(order_productstotal[beginingindex] > 1)
                        {
                          var endingrow = beginingrow + (order_productstotal[beginingindex] - 1);
                          //global.ConsoleLog("ending row " + endingrow);
                          global.ConsoleLog('merge: B' + beginingrow + ':B' + endingrow);
                          worksheet.mergeCells('A' + beginingrow + ':A' + endingrow);
                          worksheet.mergeCells('B' + beginingrow + ':B' + endingrow);
                          worksheet.mergeCells('C' + beginingrow + ':C' + endingrow);
                          worksheet.mergeCells('D' + beginingrow + ':D' + endingrow);
                          worksheet.mergeCells('E' + beginingrow + ':E' + endingrow);
                          worksheet.mergeCells('F' + beginingrow + ':F' + endingrow);
                          worksheet.mergeCells('G' + beginingrow + ':G' + endingrow);
                          worksheet.mergeCells('H' + beginingrow + ':H' + endingrow);
                          worksheet.mergeCells('I' + beginingrow + ':I' + endingrow);
                          worksheet.mergeCells('J' + beginingrow + ':J' + endingrow);
                          worksheet.mergeCells('K' + beginingrow + ':K' + endingrow);
                          worksheet.mergeCells('L' + beginingrow + ':L' + endingrow);
                          worksheet.mergeCells('M' + beginingrow + ':M' + endingrow);
                          worksheet.mergeCells('N' + beginingrow + ':N' + endingrow);
                          worksheet.mergeCells('O' + beginingrow + ':O' + endingrow);
                          worksheet.mergeCells('P' + beginingrow + ':P' + endingrow);
                          worksheet.mergeCells('Q' + beginingrow + ':Q' + endingrow);
                          worksheet.mergeCells('R' + beginingrow + ':R' + endingrow);
                          worksheet.mergeCells('S' + beginingrow + ':S' + endingrow);
                          worksheet.mergeCells('T' + beginingrow + ':T' + endingrow);
                          worksheet.mergeCells('U' + beginingrow + ':U' + endingrow);
                          worksheet.mergeCells('V' + beginingrow + ':V' + endingrow);
                          worksheet.mergeCells('W' + beginingrow + ':W' + endingrow);
                          worksheet.mergeCells('X' + beginingrow + ':X' + endingrow);
                          worksheet.mergeCells('Y' + beginingrow + ':Y' + endingrow);
                          worksheet.mergeCells('Z' + beginingrow + ':Z' + endingrow);
                          worksheet.mergeCells('AA' + beginingrow + ':AA' + endingrow);
                          worksheet.mergeCells('AL' + beginingrow + ':AL' + endingrow);
                          worksheet.mergeCells('AM' + beginingrow + ':AM' + endingrow);
                          worksheet.mergeCells('AN' + beginingrow + ':AN' + endingrow);
                          worksheet.mergeCells('AO' + beginingrow + ':AO' + endingrow);
                          worksheet.mergeCells('AP' + beginingrow + ':AP' + endingrow);
                          worksheet.mergeCells('AQ' + beginingrow + ':AQ' + endingrow);
                          worksheet.mergeCells('AR' + beginingrow + ':AR' + endingrow);
                          worksheet.mergeCells('AS' + beginingrow + ':AS' + endingrow);
                          worksheet.mergeCells('AT' + beginingrow + ':AT' + endingrow);
                          
                          beginingrow = beginingrow + order_productstotal[beginingindex];
                          beginingindex ++;
                          //global.ConsoleLog("merge, the next beining row " + beginingrow);
                        }
                        else
                        {
                          beginingrow = beginingrow + 1;
                          beginingindex ++;
                          //global.ConsoleLog("no merge, the next beining row " + beginingrow);
                        }
                        
                      }
                    }
                      
                  });
                  //global.ConsoleLog("the total number of rows: " + worksheet.rowCount);
                  workbook.xlsx.writeFile(path).then(function(){
                      global.ConsoleLog("write file succeed");
                      let result = {orderno: header.orderno, invoiceno: header.invoiceno, basename: filename, fullpath: foldername + '/' + filename,completed:1};
                      // resolve({orderno: header.orderno, invoiceno: header.invoiceno, basename: filename, fullpath: foldername + '/' + filename});

                      if (world.custconfig.exportaspdf)
                      {
                        world.spark.emit(global.eventinfo, {rc: global.errcode_none, msg: 'Output generated, now converting to PDF', pdata: world.pdata});
                        return doExcelToPDF(result, world.custconfig.exportaspdf);
                      }
                      else
                      {
                        resolve (result);
                      }
  
                  });
                 }
               else
                 reject(err);
             }
             
           );
         }
         else
         {
          resolve({orderno: header.orderno, invoiceno: header.invoiceno, basename: filename, fullpath: foldername + '/' + filename,completed:0});
         }
      }
    );
    return promise;
}

// *******************************************************************************************************************************************************************************************
// Public functions
function PrintQuotes(world)
{
  var msg = '[' + world.eventname + '] ';
  // global.ConsoleLog(global.type_quote);
  global.ConsoleLog(world.custconfig.quoteprinttemplateid);
  // global.ConsoleLog(world.quotes);
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
              doPrintOrders(tx, global.type_quote, world.custconfig.quoteprinttemplateid, world.quotes, world).then
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
                        global.ConsoleLog(result);
                        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, rs: result, pdata: world.pdata});
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error({printquotes: true}, msg);
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
                      msg += global.text_tx + ' ' + err.message;
                      global.log.error({printquotes: true}, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                    }
                  );
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({printquotes: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({printquotes: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function PrintOrders(world)
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
              doPrintOrders(tx, global.type_order, world.custconfig.orderprinttemplateid, world.orders, world).then
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

                        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, rs: result, pdata: world.pdata});
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error({printorders: true}, msg);
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
                      msg += global.text_tx + ' ' + err.message;
                      global.log.error({printorders: true}, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                    }
                  );
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({printorders: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({printorders: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function PrintInvoices(world)
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
              doPrintOrders(tx, global.type_invoice, world.custconfig.invoiceprinttemplateid, world.invoices, world).then
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

                        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, rs: result, pdata: world.pdata});
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error({printinvoices: true}, msg);
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
                      msg += global.text_tx + ' ' + err.message;
                      global.log.error({printinvoices: true}, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                    }
                  );
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({printinvoices: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({printinvoices: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function PrintDeliveryDockets(world)
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
              doPrintOrders(tx, global.type_ddocket, world.custconfig.deliverydocketprinttemplateid, world.dockets, world).then
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

                        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, rs: result, pdata: world.pdata});
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            global.log.error({printdeliverydockets: true}, msg);
                            msg += global.text_tx + ' ' + err.message;
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
                      msg += global.text_tx + ' ' + err.message;
                      global.log.error({printdeliverydockets: true}, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                    }
                  );
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({printdeliverydockets: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({printdeliverydockets: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function SendInvoice(req, res)
{
  if (!__.isUN(req.query.no))
  {
    // TODO: look up FGUID make sure it's valid, also use that to determine customers_id etc...
    global.modorders.doGetCustIdFromInvoiceNo(req.query.no).then
    (
      function(result)
      {
        doSendFile(res, result.customerid, req.query.no, global.config.folders.invoices, result.custconfig.exportaspdf);
      }
    ).then
    (
      null,
      function(err)
      {
        res.sendFile('./routes/nosuchinvoice.html');
      }
    );
  }
  else
    res.sendFile('./routes/nosuchinvoice.html');
}

function SendOrder(req, res)
{
  if (!__.isUN(req.query.no))
  {
    // TODO: look up FGUID make sure it's valid, also use that to determine customers_id etc...
    global.modorders.doGetCustIdFromOrderNo(req.query.no).then
    (
      function(result)
      {
        doSendFile(res, result.customerid, req.query.no, global.config.folders.orders, result.custconfig.exportaspdf);
      }
    ).then
    (
      null,
      function(err)
      {
        res.sendFile('./routes/nosuchorder.html');
      }
    );
  }
  else
    res.sendFile('./routes/nosuchorder.html');
}

function SendQuote(req, res)
{
  if (!__.isUN(req.query.no))
  {
    // TODO: look up FGUID make sure it's valid, also use that to determine customers_id etc...
    global.modorders.doGetCustIdFromQuoteNo(req.query.no).then
    (
      function(result)
      {
        doSendFile(res, result.customerid, req.query.no, global.config.folders.quotes, result.custconfig.exportaspdf);
      }
    ).then
    (
      null,
      function(err)
      {
        res.sendFile('./routes/nosuchquote.html');
      }
    );
  }
  else
    res.sendFile('./routes/nosuchquote.html');
}

function SendJobSheet(req, res)
{
  if (!__.isUN(req.query.no))
  {
    // TODO: look up FGUID make sure it's valid, also use that to determine customers_id etc...
    global.modtpcc.doGetCustIdFromJobSheetNo(req.query.no).then
    (
      function(result)
      {
        doSendFile(res, result.customerid, req.query.no, global.config.folders.jobsheets, result.custconfig.exportaspdf);
      }
    ).then
    (
      null,
      function(err)
      {
        res.sendFile('./routes/nojobsheet.html');
      }
    );
  }
  else
    res.sendFile('./routes/nojobsheet.html');
}

function EmailQuote(world)
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
              doEmailOrder(tx, global.type_quote, world.custconfig.quoteprinttemplateid, world).then
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
                        global.pr.sendToRoomExcept
                        (
                          global.custchannelprefix + world.cn.custid,
                          'emailsent',
                          {
                            emailid: result.emailid,
                            datecreated: result.datecreated,
                            usercreated: world.cn.uname
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
                            global.log.error({emailquote: true}, msg);
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
                      msg += global.text_tx + ' ' + err.message;
                      global.log.error({emailquote: true}, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                    }
                  );
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({emailquote: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({emailquote: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function EmailOrder(world)
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
              doEmailOrder(tx, global.type_order, world.custconfig.orderprinttemplateid, world).then
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
                        global.pr.sendToRoomExcept
                        (
                          global.custchannelprefix + world.cn.custid,
                          'emailsent',
                          {
                            emailid: result.emailid,
                            datecreated: result.datecreated,
                            usercreated: world.cn.uname
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
                            global.log.error({emailorder: true}, msg);
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
                      msg += global.text_tx + ' ' + err.message;
                      global.log.error({emailorder: true}, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                    }
                  );
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({emailorder: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({emailorder: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function EmailInvoice(world)
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
              doEmailOrder(tx, global.type_invoice, world.custconfig.invoiceprinttemplateid, world).then
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
                        global.pr.sendToRoomExcept
                        (
                          global.custchannelprefix + world.cn.custid,
                          'emailsent',
                          {
                            emailid: result.emailid,
                            datecreated: result.datecreated,
                            usercreated: world.cn.uname
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
                            global.log.error({emailinvoice: true}, msg);
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
                      msg += global.text_tx + ' ' + err.message;
                      global.log.error({emailinvoice: true}, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                    }
                  );
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({emailinvoice: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        done();
        global.log.error({emailinvoice: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function GetRfidTaps(req, res)
{
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        doGetTimeClockPeriodFromToday(global.config.defaults.defaultpaydow).then
        (
          function(result)
          {
            return doCalcPayrollFromRtap(client, result.lastpayday, result.today);
          }
        ).then
        (
          function(result)
          {
            done();
            fs.readFile
            (
              global.config.folders.templates + global.config.env.taptemplate,
              function(err, data)
              {
                if (!err)
                {
                  var sheetno = 1;
                  var blob = null;
                  var template = new global.xlwriter(data);
                  var filename = 'TA_' + global.moment().format('YYYY-MM-DD') + '.xlsx';

                  // Generate the Excel...
                  template.substitute(sheetno, result);
                  blob = template.generate();
                  fs.writeFileSync(global.path.join(__dirname, global.config.folders.timesheets + filename), blob, 'binary');

                  // Re-read completed version and send to caller...
                  var xl = global.fs.readFileSync(global.path.join(__dirname, global.config.folders.timesheets + filename));
                  res.setHeader('Content-disposition', 'attachment; filename=' + filename);
                  res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                  res.send(xl);
                }
              }
            );
          }
        ).then
        (
          null,
          function(err)
          {
            done();
            global.log.error({getrfidtaps: true}, err.message);
            res.sendfile('./routes/notags.html');
          }
        );
      }
      else
      {
        done();
        global.log.error({getrfidtaps: true}, global.text_nodbconnection);
        res.sendfile('./routes/notags.html');
      }
    }
  );
}

function GetRfidTapPeriod(req, res)
{
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var datefrom = global.moment(req.query.startdate);
        var dateto = global.moment(req.query.enddate);

        return doCalcPayrollFromRtap(client, datefrom, dateto).then
        (
          function(result)
          {
            done();
            fs.readFile
            (
              global.config.folders.templates + global.config.env.taptemplate,
              function(err, data)
              {
                if (!err)
                {
                  var sheetno = 1;
                  var blob = null;
                  var template = new global.xlwriter(data);
                  var filename = 'TA_' + global.moment().format('YYYY-MM-DD') + '.xlsx';

                  // Generate the Excel...
                  template.substitute(sheetno, result);
                  blob = template.generate();
                  fs.writeFileSync(global.path.join(__dirname, global.config.folders.timesheets + filename), blob, 'binary');

                  // Re-read completed version and send to caller...
                  var xl = global.fs.readFileSync(global.path.join(__dirname, global.config.folders.timesheets + filename));
                  res.setHeader('Content-disposition', 'attachment; filename=' + filename);
                  res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                  res.send(xl);
                }
              }
            );
          }
        ).then
        (
          null,
          function(err)
          {
            done();
            global.log.error({getrfidtapperiod: true}, msg);
            res.sendfile('./routes/notags.html');
          }
        );
      }
      else
      {
        done();
        global.log.error({getrfidtapperiod: true}, global.text_nodbconnection);
        res.sendfile('./routes/notags.html');
      }
    }
  );
}

function EmailRfidTaps()
{
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var fromdate = '';
        var todate = '';

        doGetTimeClockPeriodFromToday(global.config.env.defaultpaydow).then
        (
          function(result)
          {
            fromdate = result.lastpayday.format('YYYY-MM-DD');
            todate = result.today.format('YYYY-MM-DD');
            return doCalcPayrollFromRtap(client, result.lastpayday, result.today);
          }
        ).then
        (
          function(result)
          {
            done();
            fs.readFile
            (
              global.config.folders.templates + global.config.env.taptemplate,
              function(err, data)
              {
                if (!err)
                {
                  var sheetno = 1;
                  var blob = null;
                  var template = new global.xlwriter(data);
                  var filename = 'TA_' + todate + '.xlsx';
                  var transporter = createSMTPTransport();

                  // Generate the Excel...
                  template.substitute(sheetno, result);
                  blob = template.generate();
                  fs.writeFileSync(global.path.join(__dirname, global.config.folders.timesheets + filename), blob, 'binary');

                  transporter.sendMail
                  (
                    {
                      from: global.config.smtp.returnmail,
                      to: global.config.env.emailtaps,
                      subject: 'Big Accounting Time Data',
                      html: 'Big Accounting Time Data from <strong>' + fromdate + '</strong> to <strong>' + todate + '</strong>',
                      attachments:
                      [
                        {
                          filename: filename,
                          path: global.path.join(__dirname, global.config.folders.timesheets + filename)
                        }
                      ]
                    },
                    function(err, info)
                    {
                      console.log(err);
                      console.log(info);
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
            done();
            global.log.error({emailrfidtaps: true}, msg);
          }
        );
      }
      else
      {
        done();
        global.log.error({emailrfidtaps: true}, global.text_nodbconnection);
      }
    }
  );
}

// *******************************************************************************************************************************************************************************************
// Internal functions
module.exports.doGetOrderHeader = doGetOrderHeader;
module.exports.doExcelToPDF = doExcelToPDF;

// *******************************************************************************************************************************************************************************************
// Public functions
module.exports.PrintQuotes= PrintQuotes;
module.exports.PrintOrders= PrintOrders;
module.exports.PrintInvoices = PrintInvoices;
module.exports.PrintDeliveryDockets= PrintDeliveryDockets;

module.exports.SendOrder = SendOrder;
module.exports.SendQuote = SendQuote;
module.exports.SendInvoice = SendInvoice;
module.exports.SendJobSheet = SendJobSheet;

module.exports.EmailQuote = EmailQuote;
module.exports.EmailOrder = EmailOrder;
module.exports.EmailInvoice = EmailInvoice;

module.exports.GetRfidTaps = GetRfidTaps;
module.exports.GetRfidTapPeriod = GetRfidTapPeriod;
module.exports.EmailRfidTaps = EmailRfidTaps;

