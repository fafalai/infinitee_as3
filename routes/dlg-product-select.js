function doDlgProductSelect(clientid, enableprice, usecostprice, callback)
{
  // Filtered products (by client)
  var fp = [];

  function doReset()
  {
    $('#cbProductSelectProducts').combobox('clear');
    $('#fldProductSelectQty').numberbox('clear');
    $('#fldProductSelectPrice').numberbox('clear');
  
    doTextboxFocus('cbProductSelectProducts');
  }

  function doProductUpdated(ev, args)
  {
    var productid = $('#cbProductSelectProducts').combobox('getValue');

    if (args.data.productid == productid)
    {
      var qty = $('#fldProductSelectQty').numberbox('getValue');

      doServerDataMessage('getprice', {clientid: clientid, productid: productid, qty: qty}, {type: 'refresh'});
    }
  }

  function doGetPrice(ev, args)
  {
    if (usecostprice)
    {
      $('#fldProductSelectPrice').numberbox('setValue', args.data.price.costprice);
      return;
    }

    var qty = $('#fldProductSelectQty').numberbox('getValue');

    // Check if this has a min qty...
    if (!_.isNull(args.data.price.minqty))
    {
      var m = _.toBigNum(args.data.price.minqty);

      // If user has no qty, set it to min...
      // If user has a qty, check it's at least the min...
      if (_.isBlank(qty) || m.greaterThan(qty))
        $('#fldProductSelectQty').numberbox('setValue', args.data.price.minqty);
    }

    $('#fldProductSelectPrice').numberbox('setValue', args.data.price.unitprice);
  }

  function doEventsHandler(ev, args)
  {
    if (args == 'new')
      doNew();
    else if (args == 'edit')
      doEdit();
    else if (args == 'remove')
      doRemove();
  }

  // Need to destroy/re-create this event since it depends on arguments that change each call...
  $('#divEvents').on('productpricingupdated', doProductUpdated);
  $('#divEvents').on('getprice', doGetPrice);

  $('#divEvents').on('productpricespopup', doEventsHandler);

  $('#dlgProductSelect').dialog
  (
    {
      onClose: function()
      {
        $('#divEvents').off('productpricingupdated', doProductUpdated);
        $('#divEvents').off('getprice', doGetPrice);

        $('#divEvents').off('productpricespopup', doEventsHandler);
      },
      onOpen: function()
      {
        // Show products for this client and products that don't belong to any client...
        cache_products.forEach
        (
          function(p)
          {
            if (_.isNull(p.clientid) || (p.clientid == clientid))
            {
              fp.push
              (
                {
                  id: p.id,
                  code: p.code,
                  productcategoryname: p.productcategoryname
                }
              );
            }
          }
        );

        $('#cbProductSelectProducts').combobox
        (
          {
            valueField: 'id',
            textField: 'code',
            groupField: 'productcategoryname',
            data: fp,
            limitToList: true,
            onSelect: function(record)
            {
              var qty = $('#fldProductSelectQty').numberbox('getValue');

              doServerDataMessage('getprice', {clientid: clientid, productid: record.id, qty: qty}, {type: 'refresh'});

              doTextboxFocus('fldProductSelectQty');
            }
          }
        );

        $('#fldProductSelectQty').numberbox
        (
          $.extend
          (
            numberboxParseObj,
            {
              onChange: function(newValue, oldValue)
              {
                var productid = $('#cbProductSelectProducts').combobox('getValue');
  
                if (!_.isBlank(productid))
                  doServerDataMessage('getprice', {clientid: clientid, productid: productid, qty: newValue}, {type: 'refresh'});
              }
            }
          )
        );

        $('#fldProductSelectPrice').numberbox
        (
          {
            disabled: !enableprice
          }
        );

        $('#cbProductSelectIsRepeat').switchbutton
        (
          {
            onText: 'Repeat',
            offText: 'New',
            checked: false
          }
        );

        $('#cbProductSelectIsNewArtwork').switchbutton
        (
          {
            onText: 'Yes',
            offText: 'No',
            checked: false
          }
        );

        $('#cbProductSelectProducts').combobox('loadData', fp);

        doReset();
      },
      buttons:
      [
        {
          text: 'Select',
          handler: function()
          {
            var productid = $('#cbProductSelectProducts').combobox('getValue');
            var productname = $('#cbProductSelectProducts').combobox('getText');
            var qty = $('#fldProductSelectQty').numberbox('getValue');
            var price = $('#fldProductSelectPrice').numberbox('getValue');
            isrepeat = doSwitchButtonChecked('cbProductSelectIsRepeat');
            isnewartwork = doSwitchButtonChecked('cbProductSelectIsNewArtwork');

            if (_.isBlank(productid))
            {
              doMandatoryTextbox('Please select a product...', 'cbProductSelectProducts');
              return;
            }

            if (_.isBlank(qty) || (_.toBigNum(qty).lessThanOrEqualTo(0.0)))
            {
              doMandatoryTextbox('Please enter a non-zero quantity...', 'fldProductSelectQty');
              return;
            }

            if (callback)
              callback(productid, productname, qty, price, isrepeat, isnewartwork);

            $('#dlgProductSelect').dialog('close');
          }
        },
        {
          text: 'Reset',
          handler: function()
          {
            doReset();
          }
        },
        {
          text: 'Close',
          handler: function()
          {
            $('#dlgProductSelect').dialog('close');
          }
        }
      ]
    }
  ).dialog('center').dialog('open');
}
