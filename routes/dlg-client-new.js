let selectedClientIdAttachmentId = null;
let attachment_parentid = null;

function doDlgClientNew(parentid, clientid)
{
  var isnew = _.isUndefined(clientid) || _.isNull(clientid);
  var client = {};
  var invoicestates = [];
  var shippingstates = [];
  // For notes editor...
  var editorIndex = null;
  var originalContents = null;
  var editorPanel = null;
  var editorId = null;
  // For attachments
  let attachmentIndex = null;

  // Notes editor methods...
  function doEditorNew()
  {
    if (isnew)
      doServerMessage('newclientnote_newclient', { type: 'refresh' });
    else
      doServerDataMessage('newclientnote', { clientid: clientid }, { type: 'refresh' });
  }

  function doEditorClear()
  {
    $('#divNewClientNotesG').datagrid('clearSelections');
  }

  function doEditorEdit()
  {
    doGridGetSelectedRowData
    (
      'divNewClientNotesG',
      function(row, rowIndex)
      {
        if (_.isNull(editorIndex))
        {
          editorIndex = rowIndex;

          editorId = 'divClientNote-id-' + row.id;
          originalContents = $('#' + editorId).html();
          editorPanel = new nicEditor({fullPanel : true, iconsPath : '/js/nicedit/nicEditorIcons.gif'}).panelInstance(editorId, {hasPanel: true});
        }
      }
    );
  }

  function doEditorCancel()
  {
    editorIndex = doGridCancelEdit
    (
      'divNewClientNotesG',
      editorIndex,
      function()
      {
        editorPanel.removeInstance(editorId);

        // Perform manual cancel since editor replaces text directly into DIV...
        $('#' + editorId).html(originalContents);

        originalContents = null;
        editorPanel = null;
      }
    );
  }

  function doEditorSave()
  {
    doGridEndEditGetRow
    (
      'divNewClientNotesG',
      editorIndex,
      function(row)
      {
        var notes = nicEditors.findEditor(editorId).getContent();

        if (isnew) {
          doServerDataMessage('saveclientnote_newclient', { clientnoteid: row.id, notes: notes }, { type: 'refresh' });
        } else {
          doServerDataMessage('saveclientnote', { clientnoteid: row.id, notes: notes }, { type: 'refresh' });
        }

        editorPanel.removeInstance(editorId);
        originalContents = null;
        editorPanel = null;
        editorIndex = null;
      }
    );
  }

  function doEditorRemove()
  {
    if (!doGridGetSelectedRowData
      (
        'divNewClientNotesG',
        function(row)
        {
          doPromptOkCancel
          (
            'Remove selected note?',
            function(result)
            {
              if (result)
                doServerDataMessage('expireclientnote', {clientnoteid: row.id}, {type: 'refresh'});
            }
          );
        }
      ))
    {
      doShowError('Please select a note to remove');
    }
  }

  function doEditorSearch()
  {
    doDlgNoteSearch
    (
      function(text)
      {
        doServerDataMessage('searchclientnote', {clientid: clientid, words: text}, {type: 'refresh'});
      },
      function()
      {
        doServerDataMessage('listclientnotes', {clientid: clientid}, {type: 'refresh'});
      }
    );
  }

  function doEditorSaved(ev, args)
  {
    if (clientid == args.data.clientid)
      doServerDataMessage('listclientnotes', {clientid: clientid}, {clientnoteid: args.data.clientnoteid, type: 'refresh'});
  }

  function doCleanClientNoteLocally(){
    doServerMessage('cleanclientnotelocally',{type: 'refresh'});
  }

  function doEditorLoad(ev, args)
  {
    var data = [];

    args.data.rs.forEach
    (
      function(n)
      {
        data.push
        (
          {
            id: doNiceId(n.id),
            notes: doNiceString(n.notes),
            date: doNiceDateModifiedOrCreated(n.datemodified, n.datecreated),
            by: doNiceModifiedBy(n.datemodified, n.usermodified, n.usercreated)
          }
        );
      }
    );

    $('#divNewClientNotesG').datagrid('loadData', data);

    if (!_.isUndefined(args.pdata.clientnoteid) && !_.isNull(args.pdata.clientnoteid))
      $('#divNewClientNotesG').datagrid('selectRecord', args.pdata.clientnoteid);
  }

  function doEditorSearchNotes(ev, args)
  {
    args.data.rs.forEach
    (
      function(n)
      {
        $('#divNewClientNotesG').datagrid('selectRecord', n.id);
      }
    );
  }

  // Attachments methods
  function doNewFolder(){
    let row = $('#divNewClientAttachmentsG').treegrid('getSelected');
    attachment_parentid = !row || row.mimetype!=='Folder' ? null : row.id;
    
    doServerDataMessage('newfolderclientattachment',{clientid: clientid, parentid: attachment_parentid}, {type: 'refresh'});
    doAttachmentClear();
  }
  
  function doUploadFile(){
    $('#tbClientAttachments_uploadFile').click();
    
    let row = $('#divNewClientAttachmentsG').treegrid('getSelected');
    
    attachment_parentid = !row || row.mimetype!=='Folder' ? null : row.id;

    doAttachmentClear();
  }

  function doAttachmentClear()
  {
    $('#divNewClientAttachmentsG').treegrid('clearSelections');
  }

  function doAttachmentEdit()
  {
    doTreeGridStartEdit
    (
      'divNewClientAttachmentsG',
      attachmentIndex,
      function(row, index)
      {
        attachmentIndex = index;

        doTreeGridGetEditor
        (
          'divNewClientAttachmentsG',
          attachmentIndex,
          'name',
          function(ed)
          {
          }
        );
      }
    );
    // doAttachmentClear();
  }

  function doAttachmentCancel()
  {
    attachmentIndex = doTreeGridCancelEdit('divNewClientAttachmentsG', attachmentIndex);
    doAttachmentClear();
  }

  function doAttachmentSave()
  {
    doTreeGridEndEditGetRow
    (
      'divNewClientAttachmentsG',
      attachmentIndex,
      function(row)
      {
        doServerDataMessage('saveclientattachment', {clientattachmentid: row.id, description: row.description, name: row.name}, {type: 'refresh'});
        // doServerDataMessage('saveclientattachment', {clientattachmentid: row.id, description: row.description, isthumbnail: row.isthumbnail}, {type: 'refresh'});
      }
    );

    attachmentIndex = null;
    doAttachmentClear();
  }

  function doAttachmentRemove()
  {
    if (!doTreeGridGetSelectedRowData
      (
        'divNewClientAttachmentsG',
        function(row)
        {
          doPromptOkCancel
          (
            'Remove attachment ' + row.name + '?',
            function(result)
            {
              if (result)
                doServerDataMessage('expireclientattachment', {clientattachmentid: row.id}, {type: 'refresh'});
            }
          );
        }
      ))
    {
      doShowError('Please select an attachment to remove');
    }
    // doAttachmentClear();
  }

  function doAttachmentDownload()
  {
    doTreeGridGetSelectedRowData
    (
      'divNewClientAttachmentsG',
      function(row)
      {
        if(row.mimetype !== 'Folder')
          doThrowClientAttachment(row.id);
        else
          noty({text: 'Please select a file to download', type: 'error', timeout: 2000});
      }
    );
  }

  function doAttachmentSaved(ev, args)
  {
    if (clientid == args.data.clientid)
      doServerDataMessage('listclientattachments', { clientid: clientid }, { type: 'refresh' });
  }

  function doAttachmentList(ev, args)
  {
    var data = [];

    args.data.rs.forEach
    (
      function(p)
      {
        let node = {
          id: doNiceId(p.id),
          name: doNiceString(p.name),
          description: doNiceString(p.description),
          mimetype: doNiceString(p.mimetype),
          size: doNiceString(p.size),
          date: doNiceDateModifiedOrCreated(p.datemodified, p.datecreated),
          parentid: doNiceId(p.parentid),
          by: doNiceModifiedBy(p.datemodified, p.usermodified, p.usercreated),
          children: []
        };
        if (node.mimetype == 'Folder')
          node.iconCls = 'icon-folder-open';

        if (_.isNull(p.parentid))
          data.push(node);
        else {
          // Find parent...
          let parent = doFindParentNode(data, p.parentid);
          
          if (!_.isNull(parent)){
            parent.iconCls = '';
            parent.children.push(node);
          }
        }
      }
    );

    $('#divNewClientAttachmentsG').treegrid('loadData', data);
  }

  function doReset()
  {
    $('#cbNewClientParent').combotree('setValue', parentid);

    $("#check_ClientSametoShip").prop('checked', false);
    $("#check_ClientSametoInvoice").prop('checked', false);

    if (isnew)
    {
      $('#fldNewClientName').textbox('clear');
      $('#fldNewClientCode').textbox('clear');
      $('#fldNewClientContact1').textbox('clear');
      $('#fldNewClientContact2').textbox('clear');
      $('#fldNewClientContact3').textbox('clear');
      $('#fldNewClientContact4').textbox('clear');

      $('#fldNewClientEmail1').textbox('clear');
      $('#fldNewClientUrl1').textbox('clear');

      $('#fldNewClientMobile3').textbox('clear');
      $('#fldNewClientMobile4').textbox('clear');

      $('#fldNewClientPhone1').textbox('clear');
      $('#fldNewClientPhone2').textbox('clear');
      $('#fldNewClientPhone3').textbox('clear');

      $('#fldNewClientFax3').textbox('clear');

      $('#fldNewClientAddress1').textbox('clear');
      $('#fldNewClientAddress2').textbox('clear');
      $('#fldNewClientAddress3').textbox('clear');
      $('#fldNewClientAddress4').textbox('clear');
      $('#fldNewClientCity').textbox('clear');
      $('#fldNewClientPostcode').textbox('clear');
      $('#cbNewClientCountry').combobox('clear');
      $('#cbNewClientState').combobox('clear');

      $('#fldNewClientShippingAddress1').textbox('clear');
      $('#fldNewClientShippingAddress2').textbox('clear');
      $('#fldNewClientShippingAddress3').textbox('clear');
      $('#fldNewClientShippingAddress4').textbox('clear');
      $('#fldNewClientShippingCity').textbox('clear');
      $('#fldNewClientShippingPostcode').textbox('clear');
      $('#cbNewClientShippingCountry').combobox('clear');
      $('#cbNewClientShippingState').combobox('clear');

      $('#fldNewClientBankName').textbox('clear');
      $('#fldNewClientBankBsb').textbox('clear');
      $('#fldNewClientBankAcctNo').textbox('clear');
      $('#fldNewClientBankAcctName').textbox('clear');

      $('#fldNewClientDaysCredit').numberbox('clear');
      $('#fldNewClientLineLimit').numberbox('clear');
      $('#fldNewClientOrderLimit').numberbox('clear');
      $('#fldNewClientCreditLimit').numberbox('clear');

      $('#cbNewClientOrderTemplate').combobox('clear');
      $('#cbNewClientQuoteTemplate').combobox('clear');
      $('#cbNewClientInvoiceTemplate').combobox('clear');
      $('#cbNewClientLabelTemplate').combobox('clear');

      $('#fldNewClientAcn').textbox('clear');
      $('#fldNewClientAbn').textbox('clear');
      $('#fldNewClientHsCode').textbox('clear');
      $('#fldNewClientCustom1').textbox('clear');
      $('#fldNewClientCustom2').textbox('clear');

      $('#btnClientNewAdd').linkbutton('disable');

      $('#cbNewClientCountry').combobox('setValue', defaultCountry);
      $('#cbNewClientShippingCountry').combobox('setValue', defaultCountry);

      $('#cbNewClientPriceLevel').combobox('setValue',1);

    }
    else
    {
      if (!_.isEmpty(client))
      {
        $('#fldNewClientName').textbox('initValue', client.name);
        $('#fldNewClientCode').textbox('setValue', client.code);

        $('#fldNewClientContact1').textbox('setValue', client.contact1);
        $('#fldNewClientContact2').textbox('setValue', client.contact2);
        $('#fldNewClientContact3').textbox('setValue', client.contact3);
        $('#fldNewClientContact4').textbox('setValue', client.contact4);

        $('#fldNewClientEmail1').textbox('setValue', client.email1);
        $('#fldNewClientUrl1').textbox('setValue', client.url1);

        $('#fldNewClientMobile3').textbox('setValue', client.mobile3);
        $('#fldNewClientMobile4').textbox('setValue', client.mobile4);

        $('#fldNewClientPhone1').textbox('setValue', client.phone1);
        $('#fldNewClientPhone2').textbox('setValue', client.phone2);
        $('#fldNewClientPhone3').textbox('setValue', client.phone3);

        $('#fldNewClientFax3').textbox('setValue', client.fax3);

        $('#fldNewClientAddress1').textbox('setValue', client.address1);
        $('#fldNewClientAddress2').textbox('setValue', client.address2);
        $('#fldNewClientAddress3').textbox('setValue', client.address3);
        $('#fldNewClientAddress4').textbox('setValue', client.address4);
        $('#fldNewClientCity').textbox('setValue', client.city);
        $('#fldNewClientPostcode').textbox('setValue', client.postcode);
        $('#cbNewClientCountry').combobox('setValue', client.country);
        $('#cbNewClientState').combobox('setValue', client.state);

        $('#fldNewClientShippingAddress1').textbox('setValue', client.shipaddress1);
        $('#fldNewClientShippingAddress2').textbox('setValue', client.shipaddress2);
        $('#fldNewClientShippingAddress3').textbox('setValue', client.shipaddress3);
        $('#fldNewClientShippingAddress4').textbox('setValue', client.shipaddress4);
        $('#fldNewClientShippingCity').textbox('setValue', client.shipcity);
        $('#fldNewClientShippingPostcode').textbox('setValue', client.shippostcode);
        $('#cbNewClientShippingCountry').combobox('setValue', client.shipcountry);
        $('#cbNewClientShippingState').combobox('setValue', client.shipstate);

        $('#fldNewClientBankName').textbox('setValue', client.bankname);
        $('#fldNewClientBankBsb').textbox('setValue', client.bankbsb);
        $('#fldNewClientBankAcctNo').textbox('setValue', client.bankaccountno);
        $('#fldNewClientBankAcctName').textbox('setValue', client.banlaccountname);

        $('#fldNewClientDaysCredit').numberbox('setValue', client.dayscredit);
        $('#fldNewClientLineLimit').numberbox('setValue', client.linelimit);
        $('#fldNewClientOrderLimit').numberbox('setValue', client.orderlimit);
        $('#fldNewClientCreditLimit').numberbox('setValue', client.creditlimit);

        $('#cbNewClientOrderTemplate').combobox('setValue', client.ordertemplateid);
        $('#cbNewClientQuoteTemplate').combobox('setValue', client.quotetemplateid);
        $('#cbNewClientInvoiceTemplate').combobox('setValue', client.invoicetemplateid);
        $('#cbNewClientLabelTemplate').combobox('setValue', client.labeltemplateid);

        $('#fldNewClientAcn').textbox('setValue', client.acn);
        $('#fldNewClientAbn').textbox('setValue', client.abn);
        $('#fldNewClientHsCode').textbox('setValue', client.hscode);
        $('#fldNewClientCustom1').textbox('setValue', client.custcode1);
        $('#fldNewClientCustom2').textbox('setValue', client.custcode2);

        doSetSwitchButton('cbNewClientIsActive', client.isactive);

        $('#btnClientNewAdd').linkbutton('enable');
        $('#dlgClientNew').dialog('setTitle', 'Modify ' + client.name);

        $('#cbNewClientPriceLevel').combobox('setValue',client.pricelevel);
      }
    }

    doTextboxFocus('fldNewClientName');
  }

  function doCheckCode(ev, args)
  {
    // Code already exists?
    if (args.data.rs.length > 0)
      $('#btnClientNewAdd').linkbutton('disable');
    else
      $('#btnClientNewAdd').linkbutton('enable');
  }

  function doCientSaved(ev, args)
  {
    $('#dlgClientNew').dialog('close');
  }

  function doLoad(ev, args)
  {
    client = (args.data.client);
    doReset();
  }

  function doABNResults(ev, args)
  {
    if (!_.isUndefined(args.data.rs.Names))
      doDlgPickABN(args.data.rs.Names);
  }

  function doABNSelected(ev, args)
  {
      // Make sure we don't trigger onChange....
      $('#fldNewClientName').textbox('initValue', args.name);
      $('#fldNewClientAbn').textbox('setValue', args.abn);
  }

  function doEditorEventsHandler(ev, args)
  {
    if (args == 'new')
      doEditorNew();
    else if (args == 'clear')
      doEditorClear();
    else if (args == 'edit')
      doEditorEdit();
    else if (args == 'cancel')
      doEditorCancel();
    else if (args == 'save')
      doEditorSave();
      else if (args == 'remove')
      doEditorRemove();
    else if (args == 'search')
      doEditorSearch();
  }

  function doAttachmentEventsHandler(ev, args)
  {
    if (args == 'clear')
      doAttachmentClear();
    else if (args == 'edit')
      doAttachmentEdit();
    else if (args == 'cancel')
      doAttachmentCancel();
    else if (args == 'save')
      doAttachmentSave();
    else if (args == 'remove')
      doAttachmentRemove();
    else if (args == 'download')
      doAttachmentDownload();
    else if (args == 'newFolder')
      doNewFolder();
    else if (args == 'uploadFile')
      doUploadFile();
  }

  $('#divEvents').on('saveclientnote_newclient', doEditorLoad);
  $('#divEvents').on('newclientnote_newclient', doEditorLoad);
  $('#divEvents').on('listnewclientnote', doEditorLoad);
  $('#divEvents').on('newclientnote', doEditorSaved);
  $('#divEvents').on('saveclientnote', doEditorSaved);
  $('#divEvents').on('expireclientnote', doEditorSaved);
  $('#divEvents').on('clientnotecreated', doEditorSaved);
  $('#divEvents').on('clientnotesaved', doEditorSaved);
  $('#divEvents').on('clientnoteexpired', doEditorSaved);
  $('#divEvents').on('listclientnotes', doEditorLoad);
  $('#divEvents').on('searchclientnote', doEditorSearchNotes);

  $('#divEvents').on('listclientattachments', doAttachmentList);
  $('#divEvents').on('clientattachmentcreated', doAttachmentSaved);
  $('#divEvents').on('clientattachmentsaved', doAttachmentSaved);
  $('#divEvents').on('clientattachmentexpired', doAttachmentSaved);
  $('#divEvents').on('saveclientattachment', doAttachmentSaved);
  $('#divEvents').on('expireclientattachment', doAttachmentSaved);
  $('#divEvents').on('changeclientattachmentparent', doAttachmentSaved);

  $('#divEvents').on('checkclientcode', doCheckCode);
  $('#divEvents').on('newclient', doCientSaved);
  $('#divEvents').on('saveclient', doCientSaved);
  $('#divEvents').on('loadclient', doLoad);

  $('#divEvents').on('abnlookup', doABNResults);
  $('#divEvents').on('abnselected', doABNSelected);

  $('#divEvents').on('clientnotespopup', doEditorEventsHandler);
  $('#divEvents').on('clientattachmentspopup', doAttachmentEventsHandler);

  $('#check_ClientSametoShip').change(() => {
    if ($("#check_ClientSametoShip").prop('checked')) {
      $('#fldNewClientAddress1').textbox('setValue', $('#fldNewClientShippingAddress1').textbox('getValue'));
      $('#fldNewClientAddress2').textbox('setValue', $('#fldNewClientShippingAddress2').textbox('getValue'));
      $('#fldNewClientAddress3').textbox('setValue', $('#fldNewClientShippingAddress3').textbox('getValue'));
      $('#fldNewClientAddress4').textbox('setValue', $('#fldNewClientShippingAddress4').textbox('getValue'));
    }
  });
  $('#check_ClientSametoInvoice').change(() => {
    if ($("#check_ClientSametoInvoice").prop('checked')) {
      $('#fldNewClientShippingAddress1').textbox('setValue', $('#fldNewClientAddress1').textbox('getValue'));
      $('#fldNewClientShippingAddress2').textbox('setValue', $('#fldNewClientAddress2').textbox('getValue'));
      $('#fldNewClientShippingAddress3').textbox('setValue', $('#fldNewClientAddress3').textbox('getValue'));
      $('#fldNewClientShippingAddress4').textbox('setValue', $('#fldNewClientAddress4').textbox('getValue'));
    }
  });

  //Attachment
  $('#divEvents').on('newfolderclientattachment', doAttachmentSaved);
  $('#divEvents').on('listclientattachments', doAttachmentList);
  $('#divEvents').on('clientattachmentsaved', doAttachmentSaved);
  $('#divEvents').on('expireclientattachment', doAttachmentSaved);

  $('#dlgClientNew').dialog
  (
    {
      onClose: function()
      {
        if(isnew)
          doCleanClientNoteLocally();

        $('#divEvents').off('newfolderclientattachment', doAttachmentSaved);
        $('#divEvents').off('listclientattachments', doAttachmentList);
        $('#divEvents').off('clientattachmentsaved', doAttachmentSaved);
        $('#divEvents').off('expireclientattachment', doAttachmentSaved);

        $('#divEvents').off('saveclientnote_newclient', doEditorLoad);
        $('#divEvents').off('newclientnote_newclient', doEditorLoad);
        $('#divEvents').off('listnewclientnote', doEditorLoad);
        $('#divEvents').off('newclientnote', doEditorSaved);
        $('#divEvents').off('saveclientnote', doEditorSaved);
        $('#divEvents').off('clientnotecreated', doEditorSaved);
        $('#divEvents').off('clientnotesaved', doEditorSaved);
        $('#divEvents').off('listclientnotes', doLoad);
        $('#divEvents').off('searchclientnote', doEditorSearchNotes);

        $('#divEvents').off('listorderattachments', doAttachmentList);
        $('#divEvents').off('orderattachmentcreated', doAttachmentSaved);
        $('#divEvents').off('orderattachmentsaved', doAttachmentSaved);
        $('#divEvents').off('orderattachmentexpired', doAttachmentSaved);
        $('#divEvents').off('saveorderattachment', doAttachmentSaved);
        $('#divEvents').off('expireorderattachment', doAttachmentSaved);

        $('#divEvents').off('checkclientcode', doCheckCode);
        $('#divEvents').off('newclient', doCientSaved);
        $('#divEvents').off('saveclient', doCientSaved);
        $('#divEvents').off('loadclient', doLoad);

        $('#divEvents').off('abnlookup', doABNResults);
        $('#divEvents').off('abnselected', doABNSelected);

        $('#divEvents').off('clientnotespopup', doEditorEventsHandler);
        $('#divEvents').off('clientattachmentspopup', doAttachmentEventsHandler);

        $('#divNewClientNotesG').datagrid('loadData', []);
        $('#divNewClientAttachmentsG').datagrid('loadData', []);
      },
      onOpen: function()
      {
        selectedClientIdAttachmentId = clientid;

        $('#cbNewClientParent').combotree
        (
          {
            valueField: 'id',
            textField: 'name',
            data: cache_clients
          }
        );

        $('#fldNewClientName').textbox
        (
          {
            onChange: function(newValue, oldValue)
            {
              if (!_.isBlank(newValue))
              {
                doServerDataMessage('abnlookup', {name: newValue}, {type: 'refresh'});
                $('#btnClientNewAdd').linkbutton('enable');
              }
              else
                $('#btnClientNewAdd').linkbutton('disable');
            }
          }
        );

        $('#fldNewClientCode + span:first').keyup(function (e) { 
          let value = $('#fldNewClientCode').textbox('getText');
          if(!_.isBlank(value))
          doServerDataMessage('checkclientcode', {clientid: clientid, code: value}, {type: 'refresh'});
        });

        $('#fldNewClientCode').textbox
        (
          {
            onChange: function(newValue, oldValue)
            {
              if (!_.isBlank(newValue))
              {
                // Check we're using a unique code...
                if (newValue != oldValue)
                  doServerDataMessage('checkclientcode', {clientid: clientid, code: newValue}, {type: 'refresh'});
              }
            }
          }
        );

        $('#cbNewClientPriceLevel').combobox
        (
          {
            valueField: 'id',
            textField: 'name',
            limitToList: true,
            data: pricelevels
          }
        );

        $('#cbNewClientIsActive').switchbutton
        (
          {
            checked: true,
            onText: 'Yes',
            offText: 'No'
          }
        );

        $('#cbNewClientCountry').combobox
        (
          {
            valueField: 'country',
            textField: 'country',
            limitToList: true,
            data: cache_countries,
            onSelect: function(record)
            {
              invoicestates = doGetStatesFromCountry(record.country);

              $('#cbNewClientState').combobox('loadData', invoicestates);
            }
          }
        );

        $('#cbNewClientShippingCountry').combobox
        (
          {
            valueField: 'country',
            textField: 'country',
            limitToList: true,
            data: cache_countries,
            onSelect: function(record)
            {
              shippingstates = doGetStatesFromCountry(record.country);

              $('#cbNewClientShippingState').combobox('loadData', shippingstates);
            }
          }
        );

        $('#cbNewClientState').combobox
        (
          {
            valueField: 'state',
            textField: 'state',
            limitToList: true,
            data: invoicestates
          }
        );

        $('#cbNewClientShippingState').combobox
        (
          {
            valueField: 'state',
            textField: 'state',
            limitToList: true,
            data: shippingstates
          }
        );

        $('#cbNewClientOrderTemplate').combobox
        (
          {
            valueField: 'id',
            textField: 'description',
            limitToList: true,
            data: cache_printtemplates
          }
        );

        $('#cbNewClientQuoteTemplate').combobox
        (
          {
            valueField: 'id',
            textField: 'description',
            limitToList: true,
            data: cache_printtemplates
          }
        );

        $('#cbNewClientInvoiceTemplate').combobox
        (
          {
            valueField: 'id',
            textField: 'description',
            limitToList: true,
            data: cache_printtemplates
          }
        );

        $('#cbNewClientLabelTemplate').combobox
        (
          {
            valueField: 'id',
            textField: 'description',
            limitToList: true,
            data: cache_printtemplates
          }
        );

        $('#divNewClientNotesG').datagrid
        (
          {
            idField: 'id',
            fitColumns: true,
            singleSelect: true,
            rownumbers: false,
            toolbar: '#tbClientNotes',
            view: $.extend
            (
              {},
              $.fn.datagrid.defaults.view,
              {
                renderRow: function(target, fields, frozen, rowIndex, rowData)
                {
                  var cc = [];

                  if (!frozen && rowData.id)
                  {
                    cc.push
                    (
                      '<td style="width: 950px;; padding: 5px 5px; border: 0;">' +
                      '  <div style="float: left; margin-left: 10px;">' +
                      '    <p><span class="c-label">Modified: ' + '</span>' + rowData.date + '</p>' +
                      '    <p><span class="c-label">By: ' + '</span>' + rowData.by + '</p>' +
                      '  </div>' +
                      '  <div style="clear: both;"></div>' +
                      '  <div id="divClientNote-id-' + rowData.id + '" style="float: left; margin-left: 10px; margin-right: 10px; width: 100%; height: 100px; border: 1px dashed #ddd">' + rowData.notes + '</div> ' +
                      '</td>'
                    );
                  }
                  else
                    cc.push('<td style="width: 100%; padding: 5px 5px; border: 0;"></td>');

                  return cc.join('');
                }
              }
            ),
            onDblClickRow: function(index, row)
            {
              if (_.isNull(editorIndex))
              {
                if (row)
                {
                  editorIndex = index;

                  editorId = 'divClientNote-id-' + row.id;
                  originalContents = $('#' + editorId).html();
                  editorPanel = new nicEditor({fullPanel : true, iconsPath : '/js/nicedit/nicEditorIcons.gif'}).panelInstance(editorId, {hasPanel: true});
                }
              }
            }
          }
        );

        $('#divNewClientAttachmentsG').treegrid
        (
          {
            idField: 'id',
            treeField: 'name',
            // fitColumns: true,
            singleSelect: true,
            rownumbers: false,
            collapsible: true,
            // autoRowHeight: false,
            toolbar: '#tbClientAttachments',
            columns:
            [
              [
                {title: 'Name',        field: 'name',        width: 250, align: 'left',   resizable: true, editor: 'text'},
                {title: 'Description', field: 'description', width: 300, align: 'left',   resizable: true, editor: 'text'},
                {title: 'Type',        field: 'mimetype',    width: 100, align: 'center', resizable: true},
                {title: 'Size',        field: 'size',        width: 100, align: 'right',  resizable: true, formatter: function(value, row) {return row.mimetype=='Folder'? '':filesize(value, {base: 10});}},
                {title: 'Modified',    field: 'date',        width: 150, align: 'right',  resizable: true},
                {title: 'By',          field: 'by',          width: 100, align: 'left',   resizable: true}
              ]
            ],
            onLoadSuccess: function (row) 
            {
              $(this).treegrid('enableDnd', row ? row.id : null);
            },
            onContextMenu: function(e, row)
            {
              doTreeGridContextMenu("divNewClientAttachmentsG", "divClientAttachmentsMenuPopup", e, row);
            },
            onBeforeDrag: function (row)
            {
              if (attachmentIndex != null)
                return false;
              return true;
            },
            onBeforeDrop: function (targetRow, sourceRow, point)
            {
              if (!targetRow || targetRow.mimetype !== 'Folder')
                return false;
            },
            onDrop: function (targetRow, sourceRow, point){
              doServerDataMessage('changeclientattachmentparent', {clientattachmentid: sourceRow.id, parentid: point=='append' ? targetRow.id : null}, {type: 'refresh'});
            },
            onDblClickCell: function(index, field, value)
            {
              doTreeGridStartEdit
              (
                'divNewClientAttachmentsG',
                attachmentIndex,
                function(row, index)
                {
                  attachmentIndex = index;

                  if (['mimetype', 'size', 'by','date'].indexOf(field) != -1)
                    field = 'name';
                  doTreeGridGetEditor
                  (
                    'divNewClientAttachmentsG',
                    attachmentIndex,
                    field,
                    function(ed)
                    {
                    }
                  );
                }
              );
            }
          }
        );

        
        if (isnew)
        {
          $('#btnClientNewAdd').linkbutton({text: 'Add'});
          $('#newclienttabs').tabs('disableTab','Attachments');
        }
        else
        {
          $('#btnClientNewAdd').linkbutton({text: 'Save'});
          $('#newclienttabs').tabs('enableTab','Attachments');
        }

        if (!_.isUndefined(clientid) && !_.isNull(clientid))
        {
          doServerDataMessage('loadclient', { clientid: clientid }, { type: 'refresh' });
          doServerDataMessage('listclientattachments', {clientid: clientid}, {type: 'refresh'});
          doServerDataMessage('listclientnotes', {clientid: clientid}, {type: 'refresh'});
        }
        else
          doReset();

        doSelectFirstTab('newclienttabs');
      },
      buttons:
      [
        {
          text: 'Add',
          id: 'btnClientNewAdd',
          handler: function()
          {
            var parentid = doGetComboTreeSelectedId('cbNewClientParent');
            var name = $('#fldNewClientName').textbox('getValue');
            var code = $('#fldNewClientCode').textbox('getValue');

            var email1 = $('#fldNewClientEmail1').textbox('getValue');
            var url1 = $('#fldNewClientUrl1').textbox('getValue');

            var mobile3 = $('#fldNewClientMobile3').textbox('getValue');
            var mobile4 = $('#fldNewClientMobile4').textbox('getValue');

            var phone1 = $('#fldNewClientPhone1').textbox('getValue');
            var phone2 = $('#fldNewClientPhone2').textbox('getValue');
            var phone3 = $('#fldNewClientPhone3').textbox('getValue');

            var fax3 = $('#fldNewClientFax3').textbox('getValue');

            var contact1 = $('#fldNewClientContact1').textbox('getValue');
            var contact2 = $('#fldNewClientContact2').textbox('getValue');
            var contact3 = $('#fldNewClientContact3').textbox('getValue');
            var contact4 = $('#fldNewClientContact4').textbox('getValue');

            var bankname = $('#fldNewClientBankName').textbox('getValue');
            var bankbsb = $('#fldNewClientBankBsb').textbox('getValue');
            var bankacctno = $('#fldNewClientBankAcctNo').textbox('getValue');
            var bankacctname = $('#fldNewClientBankAcctName').textbox('getValue');

            var address1 = $('#fldNewClientAddress1').textbox('getValue');
            var address2 = $('#fldNewClientAddress2').textbox('getValue');
            var address3 = $('#fldNewClientAddress3').textbox('getValue');
            var address4 = $('#fldNewClientAddress4').textbox('getValue');
            var city = $('#fldNewClientCity').textbox('getValue');
            var postcode = $('#fldNewClientPostcode').textbox('getValue');
            var country = $('#cbNewClientCountry').combobox('getValue');
            var state = $('#cbNewClientState').combobox('getValue');

            var shiptoaddress1 = $('#fldNewClientShippingAddress1').textbox('getValue');
            var shiptoaddress2 = $('#fldNewClientShippingAddress2').textbox('getValue');
            var shiptoaddress3 = $('#fldNewClientShippingAddress3').textbox('getValue');
            var shiptoaddress4 = $('#fldNewClientShippingAddress4').textbox('getValue');
            var shiptocity = $('#fldNewClientShippingCity').textbox('getValue');
            var shiptopostcode = $('#fldNewClientShippingPostcode').textbox('getValue');
            var shiptocountry = $('#cbNewClientShippingCountry').combobox('getValue');
            var shiptostate = $('#cbNewClientShippingState').combobox('getValue');

            var dayscredit = $('#fldNewClientDaysCredit').numberbox('getValue');
            var linelimit = $('#fldNewClientLineLimit').numberbox('getValue');
            var orderlimit = $('#fldNewClientOrderLimit').numberbox('getValue');
            var creditlimit = $('#fldNewClientCreditLimit').numberbox('getValue');

            var ordertemplateid = $('#cbNewClientOrderTemplate').combobox('getValue');
            var qoutetemplateid = $('#cbNewClientQuoteTemplate').combobox('getValue');
            var invoicetemplateid = $('#cbNewClientInvoiceTemplate').combobox('getValue');
            var labeltemplateid = $('#cbNewClientLabelTemplate').combobox('getValue');

            var acn = $('#fldNewClientAcn').textbox('getValue');
            var abn = $('#fldNewClientAbn').textbox('getValue');
            var hscode = $('#fldNewClientHsCode').textbox('getValue');
            var custcode1 = $('#fldNewClientCustom1').textbox('getValue');
            var custcode2 = $('#fldNewClientCustom2').textbox('getValue');

            var isactive = doSwitchButtonChecked('cbNewClientIsActive');
            var pricelevel = $('#cbNewClientPriceLevel').combobox('getValue');
            console.log(pricelevel);


            if (!_.isBlank(name))
            {
              if (isnew)
              {
                
                doServerDataMessage
                (
                  'newclient',
                  {
                    parentid: parentid,
                    name: name,
                    code: code,
                    email1: email1,
                    url1: url1,

                    mobile3: mobile3,
                    mobile4: mobile4,

                    phone1: phone1,
                    phone2: phone2,
                    phone3: phone3,

                    fax3: fax3,

                    contact1: contact1,
                    contact2: contact2,
                    contact3: contact3,
                    contact4: contact4,

                    address1: address1,
                    address2: address2,
                    address3: address3,
                    address4: address4,
                    city: city,
                    state: state,
                    postcode: postcode,
                    country: country,

                    shiptoaddress1: shiptoaddress1,
                    shiptoaddress2: shiptoaddress2,
                    shiptoaddress3: shiptoaddress3,
                    shiptoaddress4: shiptoaddress4,
                    shiptocity: shiptocity,
                    shiptostate: shiptostate,
                    shiptopostcode: shiptopostcode,
                    shiptocountry: shiptocountry,

                    bankname: bankname,
                    bankbsb: bankbsb,
                    bankaccountno: bankacctno,
                    bankaccountname: bankacctname,

                    dayscredit: dayscredit,
                    linelimit: linelimit,
                    orderlimit: orderlimit,
                    creditlimit: creditlimit,

                    invoicetemplateid: invoicetemplateid,
                    ordertemplateid: ordertemplateid,
                    qoutetemplateid: qoutetemplateid,
                    labeltemplateid: labeltemplateid,

                    isactive: isactive,
                    issupplier: false,
                    isclient: true,

                    acn: acn,
                    abn: abn,
                    hscode: hscode,
                    custcode1: custcode1,
                    custcode2: custcode2,

                    pricelevel:pricelevel

                  },
                  {type: 'refresh'}
                );
              }
              else
              {
                doEditorSave();
                doServerDataMessage
                (
                  'saveclient',
                  {
                    clientid: clientid,
                    parentid: parentid,
                    name: name,
                    code: code,
                    email1: email1,
                    url1: url1,

                    mobile3: mobile3,
                    mobile4: mobile4,

                    phone1: phone1,
                    phone2: phone2,
                    phone3: phone3,

                    fax3: fax3,

                    contact1: contact1,
                    contact2: contact2,
                    contact3: contact3,
                    contact4: contact4,

                    address1: address1,
                    address2: address2,
                    address3: address3,
                    address4: address4,
                    city: city,
                    state: state,
                    postcode: postcode,
                    country: country,

                    shiptoaddress1: shiptoaddress1,
                    shiptoaddress2: shiptoaddress2,
                    shiptoaddress3: shiptoaddress3,
                    shiptoaddress4: shiptoaddress4,
                    shiptocity: shiptocity,
                    shiptostate: shiptostate,
                    shiptopostcode: shiptopostcode,
                    shiptocountry: shiptocountry,

                    bankname: bankname,
                    bankbsb: bankbsb,
                    bankaccountno: bankacctno,
                    bankaccountname: bankacctname,

                    dayscredit: dayscredit,
                    linelimit: linelimit,
                    orderlimit: orderlimit,
                    creditlimit: creditlimit,

                    invoicetemplateid: invoicetemplateid,
                    ordertemplateid: ordertemplateid,
                    qoutetemplateid: qoutetemplateid,
                    labeltemplateid: labeltemplateid,

                    isactive: isactive,
                    issupplier: false,
                    isclient: true,

                    acn: acn,
                    abn: abn,
                    hscode: hscode,
                    custcode1: custcode1,
                    custcode2: custcode2,

                    pricelevel:pricelevel

                  },
                  {type: 'refresh'}
                );
              }
            }
            else
              doMandatoryTextbox('Please enter an client name', 'fldNewClientName');
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
            $('#dlgClientNew').dialog('close');
          }
        }
      ]
    }
  ).dialog('center').dialog('open');
}
