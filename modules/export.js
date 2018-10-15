// *******************************************************************************************************************************************************************************************
// Public functions
function ExportProductBarcodes(args)
{
  global.modhelpers.doSimpleQuery
  (
    world,
    'select ' +
    'p1.code,' +
    'p1.name,' +
    'p1.barcode,' +
    'pc1.barcode,' +
    'c1.price + c1.gst price ' +
    'from ' +
    'products p1 left join productcodes pc1 on (p1.id=pc1.products_id) ' +
    '            left join pricing c1 on (p1.id=c1.products_id) ' +
    'where ' +
    'p1.customers_id=$1 ' +
    'and ' +
    'p1.isactive=1 ' +
    'and ' +
    'p1.dateexpired is null',
    [
      world.cn.custid,
      __.sanitiseAsBigInt(global.config.pos.locationid_warehouse),
      __.sanitiseAsDate(world.datefrom),
      __.sanitiseAsDate(world.dateto)
    ],
    function(err, result)
    {
      if (!err)
        world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, fguid: world.fguid, rs: result.rows, pdata: world.pdata});
    }
  );
}

// *******************************************************************************************************************************************************************************************
// Public ImportMyobProducts
module.exports.ExportProductBarcodes = ExportProductBarcodes;
