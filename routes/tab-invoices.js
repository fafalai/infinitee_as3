var invoicesTabWidgetsLoaded = false;

function doInvoicesTabWidgets()
{
   if (invoicesTabWidgetsLoaded)
    return;

  invoicesTabWidgetsLoaded = true;

  function doClear()
  {
    $('#divInvoicesG').datagrid('clearSelections');
  }

  function doRefresh()
  {
    doServerMessage('listinvoices', {type: 'refresh'});
  }

  function doPrint()
  {
    // doGridGetSelectedRowData
    // (
    //   'divInvoicesG',
    //   function(row)
    //   {
    //     doServerDataMessage('printinvoices', {invoices: [row.id]}, {type: 'refresh'});
    //   }
    // );
    doPromptYesNoCancel
    (
      'Download all listed invoices (Yes) or selected only (No)?',
      function(result)
      {
        console.log(result);
        if (result === true)
        {
          console.log('Print all listed invoices');
          var rowids = [];
          var data = $('#divInvoicesG').datagrid('getData');
          console.log(data.rows.length);
          
          // data.rows = data.rows.slice(0,20);
          //console.log(data.rows);
          for(var i=0;i<data.rows.length;i++)
          {
            //console.log(data.rows[i].id);
            rowids.push(data.rows[i].id);
          }
          
          console.log(rowids);
          doServerDataMessage('printinvoices', {invoices: rowids}, {type: 'refresh'});
        }
        else if (result ==  false)
        {
          if (!doGridGetSelectedRowData
            (
              'divInvoicesG',
              function(row)
              {
                console.log(row.id);
                doServerDataMessage('printinvoices', {invoices: [row.id]}, {type: 'refresh'});
              }
            ))
          {
            doShowError('Please select an invoices to download');
          }
        }
      }
    )
  }

  function doEmail()
  {
    if (!doGridGetSelectedRowData
      (
        'divInvoicesG',
        function(row)
        {
          doDlgEmailOrder(row, itype_order_invoice);
        }
      ))
    {
      doShowError('Please select an invoice to email');
    }
  }

  function doSearch()
  {
    doDlgInvoiceSearch();
  }

  function doPay()
  {
    if (!doGridGetSelectedRowData
      (
        'divInvoicesG',
        function(row)
        {
          doDlgPayInvoices(row.clientid);
        }
      ))
    {
      doDlgPayInvoices();
    }
  }

  function doStyleInvoiceDate(value, row, index)
  {
    if (row.duein < 0)
      return 'color: red';
  }

  function doFormatDueIn(value, row, index)
  {
    if (!_.isUndefined(value))
      return value + ' days';
  }

  function doSaved()
  {
    doServerMessage('listinvoices', {type: 'refresh'});
  }

  // Refresh when these events occur...
  $('#divEvents').on
  (
    'listinvoices',
    function(ev, args)
    {
      var totalprice = _.toBigNum(0.0);
      var data = [];

      args.data.rs.forEach
      (
        function(i)
        {
          var duein = 0;
          var total = _.toBigNum(i.totalprice).plus(i.totalgst);

          // If client has credit - use that for due/overdue invoice dates...
          if (!_.isUndefined(i.dayscredit) && !_.isNull(i.dayscredit) && (i.dayscredit > 0))
          {
            var dt = moment(i.date).add(i.dayscredit, 'days');

            duein = moment(dt).diff(moment(), 'days');
          }
          else
            duein = moment(i.date).diff(moment(), 'days');

          totalprice = totalprice.plus(i.totalprice);

          data.push
          (
            {
              id: doNiceId(i.id),
              clientid: doNiceId(i.clientid),
              clientname: doNiceString(i.clientname),
              name: doNiceString(i.name),
              pono: doNiceString(i.pono),
              invoiceno: doNiceString(i.invoiceno),
              orderno: doNiceString(i.orderno),
              copyno: i.copyno,
              totalprice: i.totalprice,
              totalgst:i.totalgst,
              total: _.formatnumber(total, 4, true),
              dayscredit: i.dayscredit,
              orderlimit: i.orderlimit,
              creditlimit: i.creditlimit,
              date: doNiceDate(i.invoicedate),
              by: _.titleize(i.userinvoiced),
              duein: duein,
              paid: _.formatnumber(i.paid, 2),
              balance: _.formatnumber(i.balance, 2)
            }
          );
        }
      );

      $('#divInvoicesG').datagrid('loadData', data);
      $('#divInvoicesG').datagrid('reloadFooter', [{name: '<span class="totals_footer">' + data.length + ' invoice(s)</span>', totalprice: '<span class="totals_footer">' + _.niceformatnumber(totalprice) + '</span>'}]);

      if (!_.isUndefined(args.pdata.orderid) && !_.isNull(args.pdata.invoiceid))
        $('#divInvoicesG').datagrid('selectRecord', args.pdata.invoiceid);
    }
  );

  $('#divEvents').on('payinvoices', doSaved);
  $('#divEvents').on('invoicespaid', doSaved);
  $('#divEvents').on('invoicecreated', doSaved);
  $('#divEvents').on('invoicespaid', doSaved);
  $('#divEvents').on('orderpaid', doSaved);

  $('#divEvents').on
  (
    'invoicespopup',
    function(ev, args)
    {
      if (args == 'clear')
        doClear();
      else if (args == 'refresh')
        doRefresh();
      else if (args == 'print')
        doPrint();
      else if (args == 'search')
        doSearch();
    }
  );

  $('#divInvoicesG').datagrid
  (
    {
      idField: 'id',
      fitColumns: false,
      singleSelect: true,
      rownumbers: true,
      striped: true,
      toolbar: '#tbInvoices',
      showFooter: true,
      sortName: 'invoiceno',
      sortOrder: 'desc',
      remoteSort: false,
      multiSort: true,
      frozenColumns:
      [
        [
          {title: 'Invoice #', field: 'invoiceno',     width: 150, align: 'left',  resizable: true}
        ]
      ],
      columns:
      [
        [
          {title: 'Name',      field: 'name',       width: 300, align: 'left',  resizable: true, sortable: true},
          {title: 'P.O.#',     field: 'pono',       width: 150, align: 'left',  resizable: true, sortable: true},
          {title: 'Order #',   field: 'orderno',    width: 150, align: 'left',  resizable: true, sortable: true},
          {title: 'Client',    field: 'clientid',   width: 200, align: 'left',  resizable: true, sortable: true, formatter: function(value, row) {return doGetNameFromTreeArray(cache_clients, value);}},
          {title: 'Copy #',    field: 'copyno',     width: 100, align: 'right', resizable: true},
          {title: 'Total Ex',  field: 'totalprice', width: 150, align: 'right', resizable: true, formatter: function(value, row, index) {if (_.isUndefined(row.id)) return value; return _.niceformatnumber(value);}},
          {title: 'GST',       field: 'totalgst',   width: 150, align: 'right', resizable: true, formatter: function(value, row, index) {if (_.isUndefined(row.id)) return value; return _.niceformatnumber(value);}},
          {title: 'Total',     field: 'total',      width: 150, align: 'right', resizable: true, styler: function(value, row, index) {return 'color: ' + colour_cornflowerblue}, formatter: function(value, row, index) {if (_.isUndefined(row.id)) return value; return _.niceformatnumber(value);}},
          {title: 'Invoiced',  field: 'date',       width: 150, align: 'right', resizable: true, formatter: function(value, row, index) {return _.nicedatetodisplay(value);}, sortable: true},
          {title: 'Balance',   field: 'balance',    width: 150, align: 'right', resizable: true, sortable: true, styler: function(value, row, index) {return 'color: ' + colour_indianred}, formatter: function(value, row, index) {if (_.isUndefined(row.id)) return value; return _.niceformatnumber(value);}},
          {title: 'Due In',    field: 'duein',      width: 150, align: 'right', resizable: true, styler: function(value, row, index) {return doStyleInvoiceDate(value, row, index);}, formatter: function(value, row, index) {return doFormatDueIn(value, row, index);}, sortable: true},
          {title: 'By',        field: 'by',         width: 200, align: 'left',  resizable: true, sortable: true}
        ]
      ],
      onRowContextMenu: function(e, index, row)
      {
        doGridContextMenu('divInvoicesG', 'divInvoicesMenuPopup', e, index, row);
      }
    }
  );

  doServerMessage('listinvoices', {type: 'refresh'});
}
