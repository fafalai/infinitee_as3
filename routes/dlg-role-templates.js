function doDlgRoleTemplates(row) {
    let isnew;
    if(row.name === '')
        isnew = true;
    else
        isnew = false;

    $('#divEvents').on('newuserroletemplates', doSaved);
    $('#divEvents').on('saveuserroletemplates', doSaved);

    function doSave() {
        const rows = $('#divPermissionsPG').propertygrid('getRows');
        const name = rows[0].value;
        const roles = {
            canvieworders: rows[1].value,
            cancreateorders: rows[2].value,
            canviewinvoices: rows[3].value,
            cancreateinvoices: rows[4].value,
            canviewinventory: rows[5].value,
            cancreateinventory: rows[6].value,
            canviewpayroll: rows[7].value,
            cancreatepayroll: rows[8].value,
            canviewproducts: rows[9].value,
            cancreateproducts: rows[10].value,
            canviewclients: rows[11].value,
            cancreateclients: rows[12].value,
            canviewcodes: rows[13].value,
            cancreatecodes: rows[14].value,
            canviewusers: rows[15].value,
            cancreateusers: rows[16].value,
            canviewbuilds: rows[17].value,
            cancreatebuilds: rows[18].value,
            canviewtemplates: rows[19].value,
            cancreatetemplates: rows[20].value,
            canviewbanking: rows[21].value,
            cancreatebanking: rows[22].value,
            canviewpurchasing: rows[23].value,
            cancreatepurchasing: rows[24].value,
            canviewalerts: rows[25].value,
            cancreatealerts: rows[26].value,
            canviewdashboard: rows[27].value,
            cancreatedashboard: rows[28].value
        };

        if (!isnew)
            doServerDataMessage('saveuserroletemplates', { roletemplateid: row.id, name: name, roles: roles }, { type: 'refresh' });
        else
            doServerDataMessage('newuserroletemplates', { name: name, roles: roles }, { type: 'refresh' });
    }

    function doMakeRowProperty(name, value, group) {
        const row = {
            name,
            value,
            group,
            editor: {
                type: 'checkbox',
                options: {
                    on: 1,
                    off: 0,
                },
            },
        };
        return row;
    }

    function doSaved(ev, args) {
        $('#dlgUserPermissions').dialog('close');
        $('#divRoleTemplatesTG').datagrid('clearSelections');
    }

    //   $('#divEvents').on('saveuserroles', doSaved);

    $('#dlgUserPermissions')
        .dialog({
            width: 400,
            //   title: 'roles for ' + user.name,
            onClose() {
                $('#divEvents').off('newuserroletemplates', doSaved);
                $('#divEvents').off('saveuserroletemplates', doSaved);
            },
            onOpen() {
                $('#divPermissionsPG').propertygrid({
                    showGroup: true,
                    scrollbarSize: 0,
                    toolbar: '',
                    loader(param, success, error) {
                        cache_roles = [];

                        cache_roles.push({
                            name: 'Name', value: row.name, group: 'Name', editor: 'textbox',
                        });
                        cache_roles.push(doMakeRowProperty('Can View', row.canvieworders, 'Orders'));
                        cache_roles.push(doMakeRowProperty('Can Create', row.cancreateorders, 'Orders'));
                        cache_roles.push(doMakeRowProperty('Can View', row.canviewinvoices, 'Invoices'));
                        cache_roles.push(doMakeRowProperty('Can Create', row.cancreateinvoices, 'Invoices'));
                        cache_roles.push(doMakeRowProperty('Can View', row.canviewinventory, 'Inventory'));
                        cache_roles.push(doMakeRowProperty('Can Create', row.cancreateinventory, 'Inventory'));
                        cache_roles.push(doMakeRowProperty('Can View', row.canviewpayroll, 'Payroll'));
                        cache_roles.push(doMakeRowProperty('Can Create', row.cancreatepayroll, 'Payroll'));
                        cache_roles.push(doMakeRowProperty('Can View', row.canviewproducts, 'Products'));
                        cache_roles.push(doMakeRowProperty('Can Create', row.cancreateproducts, 'Products'));
                        cache_roles.push(doMakeRowProperty('Can View', row.canviewclients, 'Clients'));
                        cache_roles.push(doMakeRowProperty('Can Create', row.cancreateclients, 'Clients'));
                        cache_roles.push(doMakeRowProperty('Can View', row.canviewcodes, 'Codes'));
                        cache_roles.push(doMakeRowProperty('Can Create', row.cancreatecodes, 'Codes'));
                        cache_roles.push(doMakeRowProperty('Can View', row.canviewusers, 'Users'));
                        cache_roles.push(doMakeRowProperty('Can Create', row.cancreateusers, 'Users'));
                        cache_roles.push(doMakeRowProperty('Can View', row.canviewbuilds, 'Builds'));
                        cache_roles.push(doMakeRowProperty('Can Create', row.cancreatebuilds, 'Builds'));
                        cache_roles.push(doMakeRowProperty('Can View', row.canviewtemplates, 'Templates'));
                        cache_roles.push(doMakeRowProperty('Can Create', row.cancreatetemplates, 'Templates'));
                        cache_roles.push(doMakeRowProperty('Can View', row.canviewbanking, 'Banking'));
                        cache_roles.push(doMakeRowProperty('Can Create', row.cancreatebanking, 'Banking'));
                        cache_roles.push(doMakeRowProperty('Can View', row.canviewpurchasing, 'Purchasing'));
                        cache_roles.push(
                            doMakeRowProperty('Can Create', row.cancreatepurchasing, 'Purchasing'),
                        );
                        cache_roles.push(doMakeRowProperty('Can View', row.canviewalerts, 'Alerts'));
                        cache_roles.push(doMakeRowProperty('Can Create', row.cancreatealerts, 'Alerts'));
                        cache_roles.push(doMakeRowProperty('Can View', row.canviewdashboard, 'Dashboard'));
                        cache_roles.push(doMakeRowProperty('Can Create', row.cancreatedashboard, 'Dashboard'));

                        success({
                            total: cache_roles.length,
                            rows: cache_roles,
                        });
                    },
                    columns: [
                        [
                            {
                                field: 'name',
                                title: 'Name',
                                width: 80,
                            },
                            {
                                field: 'value',
                                title: 'Value',
                                width: 100,
                                formatter(value, row, index) {
                                    if (row.editor.type == 'checkbox') return mapBoolToImage(value);

                                    return value;
                                },
                            },
                        ],
                    ],
                });
            },
            buttons: [
                {
                    // text: 'Create',
                    id: 'btnCreateRoleTemplates',
                    handler: doSave,
                },
                {
                    text: 'Close',
                    handler() {
                        $('#dlgUserPermissions').dialog('close');
                    },
                },
            ],
        })
        .dialog('center')
        .dialog('open');

    if (!isnew) {
        $('#btnCreateRoleTemplates').linkbutton({ text: 'Save' });
    } else {
        $('#btnCreateRoleTemplates').linkbutton({ text: 'Create' });
    }
}
