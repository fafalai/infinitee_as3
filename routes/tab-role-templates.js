let roletemplatesTabWidgetsLoaded = false;

function doRoleTemplatesTabWidgets() {
    if (roletemplatesTabWidgetsLoaded)
        return;

    roletemplatesTabWidgetsLoaded = true;

    $('#divEvents').on('listuserroletemplates', (ev, args) => {
        $('#divRoleTemplatesTG').datagrid('reload', args.data);
    });

    $('#divEvents').on('newuserroletemplates', doSaved);
    $('#divEvents').on('userroletemplatessaved', doSaved);
    $('#divEvents').on('saveuserroletemplates', doSaved);
    $('#divEvents').on('removeuserroletemplates', doSaved);

    $('#divEvents').on('roletemplatespopup',
        function (ev, args) {
            if (args == 'new')
                doNew();
            else if (args == 'clear')
                doClear();
            else if (args == 'edit')
                doEdit();
            else if (args == 'cancel')
                doCancel();
            else if (args == 'save')
                doSave();
            else if (args == 'remove')
                doRemove();
        }
    );

    function doNew() {
        let row = {
                name: '',
                canvieworders: 0,
                cancreateorders: 0,
                canviewinvoices: 0,
                cancreateinvoices: 0,
                canviewinventory: 0,
                cancreateinventory: 0,
                canviewpayroll: 0,
                cancreatepayroll: 0,
                canviewproducts: 0,
                cancreateproducts: 0,
                canviewclients: 0,
                cancreateclients: 0,
                canviewcodes: 0,
                cancreatecodes: 0,
                canviewusers: 0,
                cancreateusers: 0,
                canviewbuilds: 0,
                cancreatebuilds: 0,
                canviewtemplates: 0,
                cancreatetemplates: 0,
                canviewbanking: 0,
                cancreatebanking: 0,
                canviewpurchasing: 0,
                cancreatepurchasing: 0,
                canviewalerts: 0,
                cancreatealerts: 0,
                canviewdashboard: 0,
                cancreatedashboard: 0
            };
            doDlgRoleTemplates(row);
    }

    function doClear() {
        $('#divRoleTemplatesTG').datagrid('clearSelections');
    }

    function doEdit() {
        if (!doGridGetSelectedRowData(
                'divRoleTemplatesTG',
                function (row) {
                    doDlgRoleTemplates(row);
                }
            )) {
            doShowError('Please select a user to view/edit roles');
        }
    }

    function doCancel() {}

    function doSave() {}

    function doRemove() {
        if (!doGridGetSelectedRowData(
                'divRoleTemplatesTG',
                function (row) {
                    doPromptOkCancel(
                            'Remove ' + row.name + '?',
                            function (result) {
                                if (result)
                                    doServerDataMessage('removeuserroletemplates', {roletemplateid: row.id}, {type: 'refresh'});
                            });
                }
            )) {
            doShowError('Please select a template to delete');
        }
        doClear();
    }

    function doSaved(ev, args)
    {
      doServerMessage('listuserroletemplates', {type: 'refresh'});
    }

    $('#divRoleTemplatesTG').datagrid({
        idField: 'id',
        // treeField: 'name',
        // lines: true,
        // fit:true,
        // fitColumns: true,
        autoRowHeight: false,
        rownumbers: true,
        // striped: true,
        singleSelect: true,
        // nowrap:true,
        toolbar: '#tbRoleTemplates',
        // showFooter: true,
        // sortName: 'name',
        // sortOrder: 'asc',
        loader: function (param, success, error) {
            success({
                total: cache_roletemplates.length,
                rows: cache_roletemplates,
                // footer: [{name: '<span class="totals_footer">' + cache_roletemplates.length + ' Templates</span>'}]
            });
        },
        frozenColumns: [
            [{
                title: 'Name',
                field: 'name',
                width: 100,
                align: 'right',
                resizable: true,
                // sortable: true
            },
            {
                title: 'Modified',
                field: 'date',
                width: 100,
                align: 'right',
                resizable: true,
                // sortable: true
            },
            {
                title: 'By',
                field: 'by',
                width: 100,
                align: 'left',
                resizable: true,
                // sortable: true
            },
            ]
        ],
        columns: [
            [
                { field: 'canvieworders', title: 'Can View Orders', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'cancreateorders', title: 'Can Create Orders', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'canviewinvoices', title: 'Can View Invoices', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'cancreateinvoices', title: 'Can Create Invoices', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'canviewinventory', title: 'Can View Inventory', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'cancreateinventory', title: 'Can Create inventory', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'canviewpayroll', title: 'Can View Payroll', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'cancreatepayroll', title: 'Can Create Payroll', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'canviewproducts', title: 'Can View Products', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'cancreateproducts', title: 'Can Create Products', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'canviewclients', title: 'Can View Clients', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'cancreateclients', title: 'Can Create Clients', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'canviewcodes', title: 'Can View Codes', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'cancreatecodes', title: 'Can Create Codes', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'canviewusers', title: 'Can View Users', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'cancreateusers', title: 'Can Create Users', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'canviewbuilds', title: 'Can View Builds', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'cancreatebuilds', title: 'Can Create Builds', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'canviewtemplates', title: 'Can View Templates', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'cancreatetemplates', title: 'Can Create Templates', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'canviewbanking', title: 'Can View Banking', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'cancreatebanking', title: 'Can Create Banking', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'canviewpurchasing', title: 'Can View Purchasing', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'cancreatepurchasing', title: 'Can Create Purchasing', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'canviewalerts', title: 'Can View Alerts', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'cancreatealerts', title: 'Can Create Alerts', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'canviewdashboard', title: 'Can View Dashboard', width: 115, formatter: function (value, row, index) { return mapBoolToImage(value); } },
                { field: 'cancreatedashboard', title: 'Can Create Dashboard', width: 130, formatter: function (value, row, index) { return mapBoolToImage(value); } }
            ]
        ],
        onDblClickRow: function (index,row) {
            doDlgRoleTemplates(row);
        }
    })

}