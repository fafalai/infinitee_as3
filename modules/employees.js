// *******************************************************************************************************************************************************************************************
// Internal functions
function doNewEmployee(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'insert into employees (customers_id,employees_id,code,lastname,firstname,title,email1,phone1,address1,address2,city,state,postcode,country,bankname,bankbsb,bankaccountno,bankaccountname,startdate,enddate,payamount,payrate,payfrequency,paystdperiod,wageaccounts_id,superfunds_id,taxfileno,employmenttype,employmentstatus,altcode,overtimeallowed,workhours,taxtable,dob,gender,userscreated_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36) returning id,datecreated',
        [
          world.cn.custid,
          __.sanitiseAsBigInt(world.parentid),
          __.sanitiseAsString(world.code),
          __.sanitiseAsString(world.lastname),
          __.sanitiseAsString(world.firstname),
          __.sanitiseAsString(world.title),
          __.sanitiseAsString(world.email1),
          __.sanitiseAsString(world.phone1),
          __.sanitiseAsString(world.address1),
          __.sanitiseAsString(world.address2),
          __.sanitiseAsString(world.city),
          __.sanitiseAsString(world.state),
          __.sanitiseAsString(world.postcode),
          __.sanitiseAsString(world.country),
          __.sanitiseAsString(world.bankname),
          __.sanitiseAsString(world.bankbsb),
          __.sanitiseAsString(world.bankaccountno),
          __.sanitiseAsString(world.bankaccountname),
          __.sanitiseAsString(world.startdate),
          __.sanitiseAsString(world.enddate),
          __.formatnumber(world.payamount),
          __.sanitiseAsBigInt(world.payrate),
          __.sanitiseAsBigInt(world.payfrequency),
          __.formatnumber(world.paystdperiod),
          __.sanitiseAsBigInt(world.wageaccountid),
          __.sanitiseAsBigInt(world.superfundid),
          __.sanitiseAsString(world.taxfileno),
          __.sanitiseAsBigInt(world.employmenttype),
          __.sanitiseAsBigInt(world.employmentstatus),
          __.sanitiseAsString(world.altcode),
          __.sanitiseAsBigInt(world.overtimeallowed),
          __.sanitiseAsString(world.workhours),
          world.taxtable,
          __.sanitiseAsString(world.dob),
          (world.gender == 1) ? 'F' : 'M',
          world.cn.userid
        ],
        function(err, result)
        {
          if (!err)
          {
            var employeeid = result.rows[0].id;
            var datecreated = global.moment(result.rows[0].datecreated).format('YYYY-MM-DD HH:mm:ss');

            resolve({employeeid: employeeid, datecreated: datecreated, usercreated: world.cn.uname});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doSaveEmployee(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update ' +
        'employees ' +
        'set ' +
        'code=$1,' +
        'lastname=$2,' +
        'firstname=$3,' +
        'title=$4,' +
        'email1=$5,' +
        'phone1=$6,' +
        'address1=$7,' +
        'address2=$8,' +
        'city=$9,' +
        'state=$10,' +
        'postcode=$11,' +
        'country=$12,' +
        'bankname=$13,' +
        'bankbsb=$14,' +
        'bankaccountno=$15,' +
        'bankaccountname=$16,' +
        'startdate=$17,' +
        'enddate=$18,' +
        'payamount=$19,' +
        'payrate=$20,' +
        'payfrequency=$21,' +
        'paystdperiod=$22,' +
        'wageaccounts_id=$23,' +
        'superfunds_id=$24,' +
        'taxfileno=$25,' +
        'employmenttype=$26,' +
        'employmentstatus=$27,' +
        'altcode=$28,' +
        'overtimeallowed=$29,' +
        'workhours=$30,' +
        'taxtable=$31,' +
        'dob=$32,' +
        'gender=$33,' +
        'datemodified=now(),' +
        'usersmodified_id=$34 ' +
        'where ' +
        'customers_id=$35 ' +
        'and ' +
        'id=$36 ' +
        'and ' +
        'dateexpired is null ' +
        'returning ' +
        'datemodified',
        [
          __.sanitiseAsString(world.code),
          __.sanitiseAsString(world.lastname),
          __.sanitiseAsString(world.firstname),
          __.sanitiseAsString(world.title),
          __.sanitiseAsString(world.email1),
          __.sanitiseAsString(world.phone1),
          __.sanitiseAsString(world.address1),
          __.sanitiseAsString(world.address2),
          __.sanitiseAsString(world.city),
          __.sanitiseAsString(world.state),
          __.sanitiseAsString(world.postcode),
          __.sanitiseAsString(world.country),
          __.sanitiseAsString(world.bankname),
          __.sanitiseAsString(world.bankbsb),
          __.sanitiseAsString(world.bankaccountno),
          __.sanitiseAsString(world.bankaccountname),
          __.sanitiseAsString(world.startdate),
          __.sanitiseAsString(world.enddate),
          __.formatnumber(world.payamount),
          __.sanitiseAsBigInt(world.payrate),
          __.sanitiseAsBigInt(world.payfrequency),
          __.formatnumber(world.paystdperiod),
          __.sanitiseAsBigInt(world.wageaccountid),
          __.sanitiseAsBigInt(world.superfundid),
          __.sanitiseAsString(world.taxfileno),
          __.sanitiseAsBigInt(world.employmenttype),
          __.sanitiseAsBigInt(world.employmentstatus),
          __.sanitiseAsString(world.altcode),
          __.sanitiseAsBigInt(world.overtimeallowed),
          __.sanitiseAsString(world.workhours),
          world.taxtable,
          __.sanitiseAsString(world.dob),
          (world.gender == 1) ? 'F' : 'M',
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.employeeid)
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

function doChangeEmployeeParent(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update employees set employees_id=$1,datemodified=now(),usersmodified_id=$2 where customers_id=$3 and id=$4 returning datemodified',
        [
          __.sanitiseAsBigInt(world.parentid),
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.employeeid)
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

function doExpireEmployeeStep1(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      if (!world.cascade)
      {
        tx.query
        (
          'select e1.employees_id employeeid from employees e1 where e1.customers_id=$1 and e1.id=$2 and e1.dateexpired is null',
          [
            world.cn.custid,
            __.sanitiseAsBigInt(world.employeeid)
          ],
          function(err, result)
          {
            if (!err)
            {
              if (result.rows.length == 1)
              {
                var parentid = result.rows[0].employeeid;

                tx.query
                (
                  'update employees set employees_id=$1,datemodified=now(),usersmodified_id=$2 where customers_id=$3 and employees_id=$4 and dateexpired is null',
                  [
                    parentid,
                    world.cn.userid,
                    world.cn.custid,
                    __.sanitiseAsBigInt(world.employeeid)
                  ],
                  function(err, result)
                  {
                    if (!err)
                      resolve({employeeid: world.employeeid});
                    else
                      reject(err);
                  }
                );
              }
              else
                reject({message: global.text_unableexpireemployee});
            }
            else
              reject(err);
          }
        );
      }
      else
        resolve({employeeid: world.employeeid});
    }
  );
  return promise;
}

function doExpireEmployeeStep2(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'update employees set dateexpired=now(),usersexpired_id=$1 where customers_id=$2 and id=$3 and dateexpired is null returning dateexpired',
        [
          world.cn.userid,
          world.cn.custid,
          __.sanitiseAsBigInt(world.employeeid)
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
function ListEmployees(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'e1.id,' +
    'e1.employees_id parentid,' +
    'e1.code,' +
    'e1.altcode,' +
    'e1.lastname,' +
    'e1.firstname,' +
    'e1.altname,' +
    'e1.email1,' +
    'e1.phone1,' +
    'e1.address1,' +
    'e1.address2,' +
    'e1.city,' +
    'e1.state,' +
    'e1.postcode,' +
    'e1.country,' +
    'e1.dob,' +
    'e1.bankname,' +
    'e1.bankbsb,' +
    'e1.bankaccountno,' +
    'e1.bankaccountname,' +
    'e1.startdate,' +
    'e1.enddate,' +
    'e1.payamount,' +
    'e1.payrate,' +
    'e1.payfrequency,' +
    'e1.paystdperiod,' +
    'e1.wageaccounts_id wageaccountid,' +
    'e1.superfunds_id superfundid,' +
    'e1.taxfileno,' +
    'e1.taxtable,' +
    'e1.employmenttype,' +
    'e1.employmentstatus,' +
    'e1.title,' +
    'e1.overtimeallowed,' +
    'e1.workhours,' +
    'e1.gender,' +
    'e1.datecreated,' +
    'e1.datemodified,' +
    'e2.id parentid,' +
    'e2.code parentcode,' +
    'e2.lastname parentlastname,' +
    'e2.firstname parentfirstname,' +
    'u1.name usercreated,' +
    'u2.name usermodified ' +
    'from ' +
    'employees e1 left join employees e2 on (e1.employees_id=e2.id) ' +
    '             left join users u1 on (e1.userscreated_id=u1.id) ' +
    '             left join users u2 on (e1.usersmodified_id=u2.id) ' +
    'where ' +
    'e1.customers_id=$1 ' +
    'and ' +
    'e1.dateexpired is null ' +
    'order by ' +
    'e1.path,' +
    'e1.code',
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

function LoadEmployee(world)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'e1.id,' +
    'e1.employees_id parentid,' +
    'e1.code,' +
    'e1.altcode,' +
    'e1.lastname,' +
    'e1.firstname,' +
    'e1.altname,' +
    'e1.email1,' +
    'e1.phone1,' +
    'e1.address1,' +
    'e1.address2,' +
    'e1.city,' +
    'e1.state,' +
    'e1.postcode,' +
    'e1.country,' +
    'e1.dob,' +
    'e1.bankname,' +
    'e1.bankbsb,' +
    'e1.bankaccountno,' +
    'e1.bankaccountname,' +
    'e1.startdate,' +
    'e1.enddate,' +
    'e1.payamount,' +
    'e1.payrate,' +
    'e1.payfrequency,' +
    'e1.paystdperiod,' +
    'e1.wageaccounts_id wageaccountid,' +
    'e1.superfunds_id superfundid,' +
    'e1.taxfileno,' +
    'e1.taxtable,' +
    'e1.employmenttype,' +
    'e1.employmentstatus,' +
    'e1.title,' +
    'e1.overtimeallowed,' +
    'e1.workhours,' +
    'e1.gender,' +
    'e1.datecreated,' +
    'e1.datemodified,' +
    'e2.id parentid,' +
    'e2.code parentcode,' +
    'e2.lastname parentlastname,' +
    'e2.firstname parentfirstname,' +
    'u1.name usercreated,' +
    'u2.name usermodified ' +
    'from ' +
    'employees e1 left join employees e2 on (e1.employees_id=e2.id) ' +
    '             left join users u1 on (e1.userscreated_id=u1.id) ' +
    '             left join users u2 on (e1.usersmodified_id=u2.id) ' +
    'where ' +
    'e1.customers_id=$1 ' +
    'and ' +
    'e1.id=$2',
    [
      world.cn.custid,
      __.sanitiseAsBigInt(world.employeeid)
    ],
    function(err, result)
    {
      if (!err)
      {
        global.modhelpers.doTransformFields(result.rows);
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, employee: result.rows[0], pdata: world.pdata});
      }
    }
  );
}

function NewEmployee(world)
{
  global.modhelpers.doSimpleFunc2Tx
  (
    world,
    global.modconfig.doNextEmpNo,
    doNewEmployee,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, employeeid: world.employeeid, datecreated: result.datecreated, usercreated: result.usercreated, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'superfundcreated', {employeeid: world.employeeid, datecreated: result.datecreated, usercreated: result.usercreated}, world.spark.id);
        global.pr.sendToRoom(global.custchannelprefix + world.cn.custid, 'configsaved', {});
      }
    },
    function(f1result)
    {
      world.code = f1result.empno;
    }
  );
}

function SaveEmployee(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doSaveEmployee,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, employeeid: world.employeeid, datemodified: result.datemodified, usermodified: result.usermodified, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'employeesaved', {employeeid: world.employeeid, datemodified: result.datemodified, usermodified: result.usermodified}, world.spark.id);
      }
    }
  );
}

function ChangeEmployeeParent(world)
{
  global.modhelpers.doSimpleFunc1Tx
  (
    world,
    doChangeEmployeeParent,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, employeeid: world.employeeid, parentid: world.parentid, datemodified: result.datemodified, usermodified: result.usermodified, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'employeeparentchanged', {employeeid: world.employeeid, parentid: world.parentid, datemodified: result.datemodified, usermodified: result.usermodified}, world.spark.id);
      }
    }
  );
}

function ExpireEmployee(world)
{
  global.modhelpers.doSimpleFunc2Tx
  (
    world,
    doExpireEmployeeStep1,
    doExpireEmployeeStep2,
    function(err, result)
    {
      if (!err)
      {
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, employeeid: world.employeeid, dateexpired: result.dateexpired, userexpired: result.userexpired, pdata: world.pdata});
        global.pr.sendToRoomExcept(global.custchannelprefix + world.cn.custid, 'employeeexpired', {employeeid: world.employeeid, dateexpired: result.dateexpired, userexpired: result.userexpired}, world.spark.id);
      }
    }
  );
}

function CheckEmployeeCode(world)
{
  var binds = [world.cn.custid, world.code, world.code];
  var clause = '';

  if (!__.isNull(world.employeeid))
  {
    clause = ' and e1.id!=$4';
    binds.push(world.employeeid);
  }

  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'e1.id,' +
    'e1.code,' +
    'e1.firstname || \' \' || e1.lastname as name ' +
    'from ' +
    'employees e1 ' +
    'where ' +
    'e1.customers_id=$1 ' +
    'and ' +
    'e1.dateexpired is null ' +
    'and ' +
    '(' +
    'upper(e1.code)=upper($2) ' +
    'or ' +
    'upper(e1.altcode)=upper($3)' +
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

// *******************************************************************************************************************************************************************************************
// Public functions
module.exports.ListEmployees = ListEmployees;
module.exports.LoadEmployee = LoadEmployee;
module.exports.NewEmployee = NewEmployee;
module.exports.SaveEmployee = SaveEmployee;
module.exports.ExpireEmployee = ExpireEmployee;
module.exports.ChangeEmployeeParent = ChangeEmployeeParent;
module.exports.CheckEmployeeCode = CheckEmployeeCode;

