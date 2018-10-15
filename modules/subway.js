function SubwayOrder(world)
{
  if (!__.isUNB(world.order))
  {
    var sandwich = '';
    var bread = '';
    var toppings = '';
    var veggies = '';
    var sauces = '';
    var extras = '';
    var drinks = '';
    var total = __.toBigNum(0.0);
    var pricing = [];
    var price_sandwich = '';
    world.order.forEach
    (
      function(item)
      {
        if (item.valuepoint & 1)
        {
          sandwich = item.name;
          total = total.plus(item.price);
          pricing.push({name: item.name, price: item.price});
        }

        if (item.valuepoint & 2)
          bread = item.name;

        if (item.valuepoint & 4)
          toppings = item.name;

        if (item.valuepoint & 8)
        {
          if (__.isBlank(veggies))
            veggies = item.name;
          else
            veggies += ', ' + item.name;
        }

        if (item.valuepoint & 16)
        {
          if (__.isBlank(sauces))
            sauces = item.name;
          else
            sauces += ', ' + item.name;
        }

        if (item.valuepoint & 32)
        {
          if (__.isBlank(extras))
            extras = item.name;
          else
            extras += ', ' + item.name;

          total = total.plus(item.price);
          pricing.push({name: item.name, price: item.price});
        }

        if (item.valuepoint & 64)
        {
          if (__.isBlank(drinks))
            drinks = item.name;
          else
            drinks += ', ' + item.name;

          total = total.plus(item.price);
          pricing.push({name: item.name, price: item.price});
        }
      }
    );

    /*
    console.log(sandwich);
    console.log(bread);
    console.log(toppings);
    console.log(veggies);
    console.log(sauces);
    console.log(extras);
    console.log(drinks);
    console.log(__.formatnumber(total, 2));
    console.log('pricing', pricing);
    */

    global.pr.sendToRoom
    (
      global.custchannelprefix + world.cn.custid,
      'subneworder',
      {
        ordername: world.cn.uname,
        orderdate: global.moment().format('YYYY-MM-DD HH:mm:ss'),
        sandwich: sandwich,
        bread: bread,
        toppings: toppings,
        veggies: veggies,
        sauces: sauces,
        extras: extras,
        drinks: drinks,
        total: __.formatnumber(total, 2),
        pricing: pricing
      }
    );

    global.printer.init
    (
      {
        type: 'epson',
        interface: 'tcp://10.0.1.3:9100',
      }
    );

    printer.alignCenter();
    printer.printImage
    (
      './logo_subway.png',
      function(done)
      {
        printer.newLine();
        printer.setTextDoubleWidth();
        printer.println('Order ' + global.counter++);
        printer.drawLine();
    
        printer.alignLeft();
        printer.setTextNormal();
        printer.leftRight('Ian', '4/10/2018');
        printer.leftRight(' ', '3:00pm');
        printer.newLine();
    
        printer.underline(true);
        printer.tableCustom
        (
          [
            {text: 'Item',  align: 'LEFT',  width: 0.5,  bold: true},
            {text: 'Qty',   align: 'RIGHT', width: 0.25, bold: true},
            {text: 'Price', align: 'RIGHT', width: 0.25, bold: true}
          ]
        );
        printer.underline(false);
    
        pricing.forEach
        (
          function(p)
          {
            printer.tableCustom
            (
              [
                {text: p.name,  align: 'LEFT',  width: 0.5,  bold: true},
                {text: '1',     align: 'RIGHT', width: 0.25, bold: true},
                {text: p.price, align: 'RIGHT', width: 0.25, bold: true}
              ]
            );
          }
        );

        printer.tableCustom
        (
          [
            {text: ' ',                       align: 'LEFT',  width: 0.5,  bold: true},
            {text: 'Total',                   align: 'RIGHT', width: 0.25, bold: true},
            {text: __.formatnumber(total, 2), align: 'RIGHT', width: 0.25, bold: true}
          ]
        );
        printer.newLine();
    
        printer.alignCenter();
        printer.println('Thank You for Your Order!');
        printer.newLine();
        printer.printQR("http://www.subway.com.au");
    
        printer.cut();
    
        printer.execute
        (
          function(err)
          {
            if (err)
            {
              console.error("Print failed", err);
            }
            else
            {
             console.log("Print done");
            }
          }
        );
      }
    );
  }
}

function SubwayStarted(world)
{
  global.pr.sendToRoom
  (
    global.custchannelprefix + world.cn.custid,
    'substarted',
    {
      date: global.moment().format('YYYY-MM-DD HH:mm:ss')
    }
  );
}

function SubwayFinished(world)
{
  global.pr.sendToRoom
  (
    global.custchannelprefix + world.cn.custid,
    'subfinished',
    {
      date: 
      global.moment().format('YYYY-MM-DD HH:mm:ss')
    }
  );
}

function SubwayDelivered(world)
{
  global.pr.sendToRoom
  (
    global.custchannelprefix + world.cn.custid,
    'subdelivered',
    {
      date: new global.moment().format('YYYY-MM-DD HH:mm:ss')
    }
  );
}

// *******************************************************************************************************************************************************************************************
// Public functions
module.exports.SubwayOrder = SubwayOrder;
module.exports.SubwayStarted = SubwayStarted;
module.exports.SubwayFinished = SubwayFinished;
module.exports.SubwayDelivered = SubwayDelivered;
