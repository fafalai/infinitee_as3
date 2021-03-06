var ordersTabWidgetsLoaded = false;

function doOrdersTabWidgets()
{
  var versions = [];

  if (ordersTabWidgetsLoaded)
    return;

  ordersTabWidgetsLoaded = true;

  function doNew()
  {
    doDlgOrderNew(false, null);
  }

  function doClear()
  {
    $('#divOrdersG').datagrid('clearSelections');
  }

  function doRemove()
  {
    if (!doGridGetSelectedRowData
      (
        'divOrdersG',
        function(row)
        {
          if (_.isBlank(row.invoiceno))
          {
            doPromptOkCancel
            (
              'Remove order ' + row.orderno + '?',
              function(result)
              {
                if (result)
                  doServerDataMessage('expireorder', {orderid: row.id}, {type: 'refresh'});
              }
            );
          }
          else
            doShowWarning('Can not remove an invoiced order');
        }
      ))
    {
      doShowError('Please select an order to remove');
    }
  }

  function doRefresh()
  {
    doServerMessage('listorders', {type: 'refresh'});
  }

  function doPrint()
  {
    // doGridGetSelectedRowData
    // (
    //   'divOrdersG',
    //   function(row)
    //   {
    //     doServerDataMessage('printorders', {orders: [row.id]}, {type: 'refresh'});
    //   }
    // );

    doPromptYesNoCancel
    (
      'Download all listed orders (Yes) or selected only (No)?',
      function(result)
      {
        console.log(result);
        if (result === true)
        {
          console.log('Print all listed orders');
          var rowids = [];
          var data = $('#divOrdersG').datagrid('getData');
          console.log(data.rows.length);
          
          // data.rows = data.rows.slice(0,20);
          //console.log(data.rows);
          for(var i=0;i<data.rows.length;i++)
          {
            //console.log(data.rows[i].id);
            rowids.push(data.rows[i].id);
          }
          
          console.log(rowids);
          doServerDataMessage('printorders', {orders: rowids}, {type: 'refresh'});
        }
        else if (result ==  false)
        {
          if (!doGridGetSelectedRowData
            (
              'divOrdersG',
              function(row)
              {
                console.log(row.id);
                doServerDataMessage('printorders', {orders: [row.id]}, {type: 'refresh'});
              }
            ))
          {
            doShowError('Please select an order to download');
          }
        }
      }
    )
  }

  function doEmail()
  {
    if (!doGridGetSelectedRowData
      (
        'divOrdersG',
        function(row)
        {
          doDlgEmailOrder(row, itype_order_order);
        }
      ))
    {
      doShowError('Please select an order to email');
    }
  }

  function doDuplicate()
  {
    if (!doGridGetSelectedRowData
      (
        'divOrdersG',
        function(row)
        {
          doPromptOkCancel
          (
            'Duplicate order ' + row.orderno + '?',
            function(result)
            {
              if (result)
                doServerDataMessage('duplicateorder', {isquote: false, orderid: row.id}, {type: 'refresh'});
            }
          );
        }
      ))
    {
      doShowError('Please select an order to duplicate');
    }
  }

  function doNewVersion()
  {
    if (!doGridGetSelectedRowData
      (
        'divOrdersG',
        function(row)
        {
          if (_.isBlank(row.invoiceno))
          {
            doPromptOkCancel
            (
              'Create new version from version ' + row.activeversion + ' of ' + row.orderno + '?',
              function(result)
              {
                if (result)
                  doServerDataMessage('newversionorder', {orderid: row.id, version: row.activeversion}, {type: 'refresh'});
              }
            );
          }
          else
            doShowWarning('Can not create new version of an invoiced order');
        }
      ))
    {
      doShowError('Please select an order');
    }
  }

  function doSearch()
  {
    doDlgOrderSearch();
  }

  function doInvoice()
  {
    if (!doGridGetSelectedRowData
      (
        'divOrdersG',
        function(row)
        {
          if (_.isBlank(row.invoiceno))
          {
            doPromptOkCancel
            (
              'Convert order #' + row.orderno + ' to invoice?',
              function(result)
              {
                if (result)
                  doServerDataMessage('createinvoicefromorder', {orderid: row.id}, {type: 'refresh'});
              }
            );
          }
          else
            doShowWarning('Order has already been invoiced');
        }
      ))
    {
      doShowError('Please select an order to invoice');
    }
  }

  function doDeposit()
  {
    if (!doGridGetSelectedRowData
      (
        'divOrdersG',
        function(row)
        {
          doDlgPayeposits(row.clientid);
        }
      ))
    {
      doShowError('Please select an order to pay');
    }
  }

  function doJobSheet()
  {
    if (!doGridGetSelectedRowData
      (
        'divOrdersG',
        function(row)
        {
          doSelectJobSheetsTab();
          $('#divEvents').trigger('selectjobsheetbyorderid', {orderid: row.id});
        }
      ))
    {
      doShowError('Please select an order to pay');
    }
  }

  function doSaved(ev, args)
  {
    doServerMessage('listorders', {type: 'refresh', orderid: args.data.orderid});
  }

  function doFooter(data)
  {
    var totalprice = _.toBigNum(0.0);
    var totalqty = _.toBigNum(0.0);

    data.forEach
    (
      function(o)
      {
        if (!_.isBlank(o.totalprice))
          totalprice = totalprice.plus(o.totalprice);

        if (!_.isBlank(o.totalqty))
          totalqty = totalqty.plus(o.totalqty);
      }
    );

    $('#divOrdersG').datagrid
    (
      'reloadFooter',
      [
        {
          orderno: '<span class="totals_footer">' + data.length + ' order(s)</span>',
          totalprice: '<span class="totals_footer">' + _.niceformatnumber(totalprice) + '</span>',
          totalqty: '<span class="totals_footer">' + _.niceformatnumber(totalqty) + '</span>'
        }
      ]
    );
  }

  // Respond to these events...
  $('#divEvents').on
  (
    'searchorders',
    function(ev, args)
    {
    }
  );

  $('#divEvents').on
  (
    'listorders',
    function(ev, args)
    {
      var data = [];

      args.data.rs.forEach
      (
        function(o)
        {
          var total = _.toBigNum(o.totalprice).plus(o.totalgst);

          data.push
          (
            {
              id: doNiceId(o.id),
              clientid: doNiceId(o.clientid),
              orderno: doNiceString(o.orderno),
              invoiceno: doNiceString(o.invoiceno),
              name: doNiceString(o.name),
              pono: doNiceString(o.pono),
              numversions: _.formatinteger(o.numversions),
              activeversion: _.formatinteger(o.activeversion),
              startdate: _.nicedatetodisplay(o.startdate),
              enddate: _.nicedatetodisplay(o.enddate),
              totalprice: o.totalprice,
              totalgst: o.totalgst,
              totalqty: o.totalqty,
              total: _.formatnumber(total, 4, true),
              paid: o.paid,
              balance: o.balance,
              inventorycommitted: doNiceIntToBool(o.inventorycommitted),
              isrepeat: o.isrepeat,
              isnewartwork: o.isnewartwork,
              status: doGetStringFromIdInObjArray(orderstatustypes, o.status),
              attachmentid: doNiceId(o.attachmentid),
              attachmentname: doNiceString(o.attachmentname),
              attachmentimage: doNiceString(o.attachmentimage),
              date: doNiceDateModifiedOrCreated(o.datemodified, o.datecreated),
              by: doNiceModifiedBy(o.datemodified, o.usermodified, o.usercreated)
            }
          );
        }
      );

      $('#divOrdersG').datagrid('loadData', data);
      doFooter(data);

      doGridSelectRowById('divOrdersG', args.pdata.orderid);
    }
  );

  $('#divEvents').on('neworder', doSaved);
  $('#divEvents').on('saveorder', doSaved);
  $('#divEvents').on('expireorder', doSaved);
  $('#divEvents').on('newversionorder', doSaved);
  $('#divEvents').on('ordernewversion', doSaved);
  $('#divEvents').on('neworderdetail', doSaved);
  $('#divEvents').on('saveorderdetail', doSaved);
  $('#divEvents').on('expireorderdetail', doSaved);
  $('#divEvents').on('orderdetailcreated', doSaved);
  $('#divEvents').on('orderdetailsaved', doSaved);
  $('#divEvents').on('orderdetailexpired', doSaved);
  $('#divEvents').on('orderattachmentsaved', doSaved);
  $('#divEvents').on('orderattachmentexpired', doSaved);
  $('#divEvents').on('neworderstatus', doSaved);
  $('#divEvents').on('orderstatuscreated', doSaved);
  $('#divEvents').on('ordercreated', doSaved);
  $('#divEvents').on('ordersaved', doSaved);
  $('#divEvents').on('orderexpired', doSaved);
  $('#divEvents').on('orderduplicated', doSaved);
  $('#divEvents').on('saveaccount', doSaved);
  $('#divEvents').on('saveclient', doSaved);
  $('#divEvents').on('clientsaved', doSaved);
  $('#divEvents').on('inventoryadded', doSaved);
  $('#divEvents').on('invoicecreated', doSaved);

  $('#divEvents').on
  (
    'duplicateorder',
    function(ev, args)
    {
      if (!_.isUN(args.data.orderno))
      {
        doShowWarning('New order ' + args.data.orderno + ' created');
        doServerMessage('listorders', {type: 'refresh'});
      }
    }
  );

  $('#divEvents').on
  (
    'new-client-order',
    function(ev, args)
    {
      doSelectSalesTab('Orders');
    }
  );

  $('#divEvents').on
  (
    'selectorderid',
    function(ev, args)
    {
      // TODO: This doesn't work if TAB hasn't already been opened/populated yet...
      if (!_.isUndefined(args.id) && !_.isNull(args.id))
        $('#divOrdersG').datagrid('selectRecord', args.id);
    }
  );

  $('#divEvents').on
  (
    'orderspopup',
    function(ev, args)
    {
      if (args == 'new')
        doNew();
      else if (args == 'clear')
        doClear();
      else if (args == 'remove')
        doRemove();
      else if (args == 'refresh')
        doRefresh();
      else if (args == 'print')
        doPrint();
      else if (args == 'email')
        doEmail();
      else if (args == 'duplicate')
        doDuplicate();
      else if (args == 'newversion')
        doNewVersion();
      else if (args == 'search')
        doSearch();
      else if (args == 'deposit')
        doDeposit();
      else if (args == 'invoice')
        doInvoice();
      else if (args == 'jobsheet')
        doJobSheet();
    }
  );

  orderInvoiceToStates = doGetStatesFromCountry(defaultCountry);
  orderShipToStates = doGetStatesFromCountry(defaultCountry);

  $('#divOrdersG').datagrid
  (
    {
      idField: 'id',
      fitColumns: false,
      singleSelect: true,
      rownumbers: true,
      striped: true,
      toolbar: '#tbOrders',
      showFooter: true,
      sortName: 'orderno',
      sortOrder: 'desc',
      remoteSort: false,
      multiSort: true,
      autoRowHeight: false,
      view: groupview,
      groupField: 'status',
      frozenColumns:
      [
        [
          {title: 'Order #',        rowspan: 2,  field: 'orderno',            width: 150,  align: 'left',  resizable: true, sortable: true}
        ],
        [
        ]
      ],
      columns:
      [
        [
          {title: 'Name',            rowspan: 2,  field: 'name',               width: 300, align: 'left',   resizable: true, sortable: true},
          {title: 'P.O.#',           rowspan: 2,  field: 'pono',               width: 150, align: 'left',   resizable: true, sortable: true},
          {title: 'Client',          rowspan: 2,  field: 'clientid',           width: 300, align: 'left',   resizable: true, formatter: function(value, row) {return doGetNameFromTreeArray(cache_clients, value);}, sortable: true},
          {title: 'Version',         rowspan: 2,  field: 'activeversion',      width: 100, align: 'right',  resizable: true},
          {title: 'Status',          rowspan: 2,  field: 'status',             width: 200, align: 'left',   resizable: true},
          {title: 'Total Ex',        rowspan: 2,  field: 'totalprice',         width: 150, align: 'right',  resizable: true, formatter: function(value, row, index) {if (!_.isUndefined(row.id)) return _.niceformatnumber(value); return value;}},
          {title: 'GST',             rowspan: 2,  field: 'totalgst',           width: 150, align: 'right',  resizable: true, formatter: function(value, row, index) {if (!_.isUndefined(row.id)) return _.niceformatnumber(value); return value;}},
          {title: 'Total Inc',       rowspan: 2,  field: 'total',              width: 150, align: 'right',  resizable: true, styler: function(value, row, index) {return 'color: ' + colour_cornflowerblue}, formatter: function(value, row, index) {if (_.isUndefined(row.id)) return value; return _.niceformatnumber(value);}},
          {title: 'Stock Committed', rowspan: 2,  field: 'inventorycommitted', width: 150, align: 'center', resizable: true, formatter: function(value, row) {return mapBoolToImage(value);}},
          {title: 'Balance',         rowspan: 2,  field: 'balance',            width: 150, align: 'right',  resizable: true, sortable: true, styler: function(value, row, index) {return 'color: ' + colour_indianred}, formatter: function(value, row, index) {if (_.isUndefined(row.id)) return _.niceformatnumber(value); return value;}},
          {title: 'Date',            colspan: 2},
          {title: 'Modified',        rowspan: 2,  field: 'date',               width: 150, align: 'right',  resizable: true, sortable: true},
          {title: 'By',              rowspan: 2,  field: 'by',                 width: 200, align: 'left',   resizable: true, sortable: true}
        ],
        [
          {title: 'Start',                        field: 'startdate',          width: 150, align: 'right',  resizable: true, formatter: function(value, row) {return _.nicedatetodisplay(value);}, sortable: true},
          {title: 'Required',                     field: 'enddate',            width: 150, align: 'right',  resizable: true, formatter: function(value, row) {return _.nicedatetodisplay(value);}, sortable: true}
        ]
      ],
      groupFormatter: function(value, rows)
      {
        return value + ' - ' + rows.length + ' order(s)';
      },
      onRowContextMenu: function(e, index, row)
      {
        doGridContextMenu('divOrdersG', 'divOrdersMenuPopup', e, index, row);
      },
      onBeginEdit: function(rowIndex)
      {
      },
      onDblClickCell: function(index, field, value)
      {
        doGetGridGetRowDataByIndex
        (
          'divOrdersG',
          index,
          function(row)
          {
            doDlgOrderNew(false, row.id);
          }
        );
      }
    }
  );

  if (posonly)
  {
    $('#divOrdersG').datagrid('hideColumn', 'pono');
    $('#divOrdersG').datagrid('hideColumn', 'activeversion');
    $('#divOrdersG').datagrid('hideColumn', 'status');
    $('#divOrdersG').datagrid('hideColumn', 'inventorycommitted');
    $('#divOrdersG').datagrid('hideColumn', 'balance');
    $('#divOrdersG').datagrid('hideColumn', 'startdate');
    $('#divOrdersG').datagrid('hideColumn', 'enddate');

    $('#tbOrdersDeposit').css('display', 'none');
    $('#tbOrdersInvoice').css('display', 'none');
  }

  // Check user permissions for this TAB...
  if (!isadmin && !myperms.cancreateorders)
  {
    $('#tbOrdersNew').css('display', 'none');
    $('#tbOrdersRemove').css('display', 'none');
    $('#tbOrdersDuplicate').css('display', 'none');
  }

  doServerMessage('listorders', {type: 'refresh'});
}
