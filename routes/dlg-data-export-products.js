function doDownloadCurrent()
{
    // noty({text: 'Want to download the current product list', type: 'info', timeout: 4000});
    doServerDataMessage('downloadproductscurrent', {type: 'refresh'});
}


function doDlgDataExportProducts()
{
  $('#dlgDataExportProducts').dialog
  (
    {
      onClose: function()
      {
      },
      onOpen: function()
      {
        $('#cbImportProductCategories').combobox
        (
          {
            valueField: 'id',
            textField: 'name',
            data: cache_productcategories
          }
        );
      },
      buttons:
      [
        {
          text: 'Close',
          handler: function()
          {
            $('#dlgDataExportProducts').dialog('close');
          }
        }
      ]
    }
  ).dialog('center').dialog('open');
}
