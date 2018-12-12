'use strict';
// const { Pool, Client } = require('pg');
// const _ = require('lodash');
// const async = require('async');
// const moment = require('moment');

// const pool = new Pool({ connectionString });

// pool.on('error', (err, client) => {
// 	console.error('Unexpected error on idle client', err);
// 	process.exit(-1);
// });


// *******************************************************************************************************************************************************************************************
// Internal functions
// *******************************************************************************************************************************************************************************************

function doRegisterProduct(client,data)
{
	return new Promise((resolve, reject) => {
		const shouldAbort = err => {
			if (err) {
				console.error('Error in transaction', err.stack);
				client.query('ROLLBACK', err => {
					if (err) {
						console.error('Error rolling back client', err.stack);
					}
					// release the client back to the pool
					done();
				});
	
				reject(err.message);
			}
			return !!err;
		};
	
		client.query('BEGIN', err => {
			if (shouldAbort(err)) return;

			let sql =
				'INSERT INTO scanapp_testing_products (name,barcode,serial_number,description,locations1_id,productcategories_id,status_id,datecreated,comments,userscreated_id) VALUES($1,$2,$3,$4,$5,$6,$7,now(),$8,$9) returning id';
			let params = [
				__.sanitiseAsString(data.name, 50),
				data.barcode.toUpperCase(),
				__.sanitiseAsString(data.serial_number, 50),
				__.sanitiseAsString(data.description),
				__.sanitiseAsBigInt(data.locations1_id),
				__.sanitiseAsBigInt(data.categoryid),
				__.sanitiseAsBigInt(data.status_id),
				__.sanitiseAsString(data.comments),
				__.sanitiseAsString(data.user_id),
			];
			client.query(sql, params, (err, result) => {
				if (shouldAbort(err)) return;
				client.query('COMMIT', err => {
					if (err) {
						console.error('Error committing transaction', err.stack);
					} else {
						resolve(result.rows[0]);
					}
				});
			});
		});
	});
}

/**
 * This is the function to check whether the scanned barcode is in the audit list
 */
function doCheckAuditList(client,barcode,user_id)
{
	global.ConsoleLog("doCheckAuditList");
	return new Promise((resolve, reject) => {
		const shouldAbort = err => {
			if (err) {
				console.error('Error in transaction', err.stack);
				client.query('ROLLBACK', err => {
					if (err) {
						console.error('Error rolling back client', err.stack);
					}
					// release the client back to the pool
					done();
				});
	
				reject(err.message);
			}
			return !!err;
		};
	
		client.query('BEGIN', err => {
			if (shouldAbort(err)) return;
			let selectsql =
				'select a1.id,a1.products_id,a1.audit_nameid,a1.audit_typeid,a1.datefinished,p1.barcode ,p1.name,p1.comments,' +
				'p1.description,p1.serial_number,p1.status_id,s1.name status,' + 
				'p1.locations1_id,l1.name locations,'+
				'p1.productcategories_id,c1.name category '+
				'from scanapp_testing_audit a1 ' +
				'left join scanapp_testing_products p1 on (p1.id = a1.products_id) ' + 
				'left join scanapp_testing_productcategories c1 on (c1.id = p1.productcategories_id) '+
				'left join scanapp_testing_locations l1 on (l1.id = p1.locations1_id) '+
				'left join scanapp_testing_statuses s1 on (s1.id = p1.status_id) '+
				'where p1.barcode = $1 '+
				'and a1.dateexpired is null ' +
				// 'and a1.datefinished is null ' +
				'and a1.userscreated_id =$2';
			let params = [
				__.sanitiseAsString(barcode, 50),
				user_id,	
			];
			client.query(selectsql, params, (err, result) => {
				// global.ConsoleLog(selectsql);
				// global.ConsoleLog(params);
				// global.ConsoleLog(err);
				// global.ConsoleLog(result);
				if (shouldAbort(err)) return;
				client.query('COMMIT', err => {
					if (err) {
						console.error('Error committing transaction', err.stack);
					} else {
						global.ConsoleLog(result.rows[0]);
						resolve(result.rows);							
					}
				});
			});
		});
	});

}

/** 
 * This is the function called when the scanned barcode is in the audit list. Use this function to update the product in the audite list to be 'audited'
*/
function doUpdateAuditList(client,auditid)
{
	global.ConsoleLog("doUpdateAuditList");
	return new Promise((resolve, reject) => {
		const shouldAbort = err => {
			if (err) {
				console.error('Error in transaction', err.stack);
				client.query('ROLLBACK', err => {
					if (err) {
						console.error('Error rolling back client', err.stack);
					}
					// release the client back to the pool
					done();
				});

				reject(err.message);
			}
			return !!err;
		};

		client.query('BEGIN', err => {
			if (shouldAbort(err)) return;
			let updatesql =
				'UPDATE scanapp_testing_audit ' + 
				'SET datefinished=now() '+
				'where id = $1 '+
				'returning datefinished,products_id,status_id ';
			let params = [
				auditid	
			];
			client.query(updatesql, params, (err, result) => {
				global.ConsoleLog(updatesql);
				global.ConsoleLog(params);
				global.ConsoleLog(err);
				global.ConsoleLog(result);
				if (shouldAbort(err)) return;

				client.query('COMMIT', err => {
					// done();
					if (err) {
						console.error('Error committing transaction', err.stack);
					} else {
						global.ConsoleLog(result.rows[0]['datefinished']);
						result.rows[0]['datefinished'] = global.moment(result.rows[0]['datefinished']).format('YYYY-MM-DD HH:mm');
						// let datefinished = global.moment(result.rows[0]['datefinished']).format('YYYY-MM-DD HH:mm');
						// global.ConsoleLog(datefinished);
						resolve(result.rows[0]);
					}
				});
			});
		});
	});
}

/**
 * This is the function used when the scanned barcode is not in the to-be-audit list, and hasn't been audited before. Use it to get the product detail for next move. 
 */
function doGetBarcodeDetails(client,barcode)
{
	global.ConsoleLog("doGetBarcodeDetails");
	return new Promise((resolve, reject) => {
		const shouldAbort = err => {
			if (err) {
				console.error('Error in transaction', err.stack);
				client.query('ROLLBACK', err => {
					if (err) {
						console.error('Error rolling back client', err.stack);
					}
					// release the client back to the pool
					done();
				});

				reject(err.message);
			}
			return !!err;
		};

		client.query('BEGIN', err => {
			if (shouldAbort(err)) return;
			let selectsql =
					'select p1.id products_id ,p1.name,p1.barcode,p1.status_id,s1.name status,'+
					'p1.productcategories_id,c1.name category,p1.locations1_id,l1.name locations,'+
					'p1.serial_number,p1.description,p1.comments ' + 
					'from scanapp_testing_products p1 '+
					'left join scanapp_testing_statuses s1 on(s1.id = p1.status_id) '+
					'left join scanapp_testing_locations l1 on(l1.id = p1.locations1_id) '+
					'left join scanapp_testing_productcategories c1 on(c1.id = p1.productcategories_id) '+
					'where barcode = $1'
			let params = [
				barcode	
			];
			client.query(selectsql, params, (err, result) => {
				global.ConsoleLog(selectsql);
				global.ConsoleLog(params);
				global.ConsoleLog(err);
				global.ConsoleLog(result);
				if (shouldAbort(err)) return;

				client.query('COMMIT', err => {
					// done();
					if (err) {
						console.error('Error committing transaction', err.stack);
					} else {
						// global.ConsoleLog(result.rows[0]['datefinished']);
						// let datefinished = global.moment(result.rows[0]['datefinished']).format('YYYY-MM-DD HH:mm');
						// global.ConsoleLog(datefinished);
						resolve(result.rows);							
					}
				});
			});
		});
	});
}
/**
 * 
 */
function doGetAuditScanned(client,data)
{
	global.ConsoleLog("doGetAuditScanned");
	return new Promise((resolve, reject) => {
		const shouldAbort = err => {
			if (err) {
				console.error('Error in transaction', err.stack);
				client.query('ROLLBACK', err => {
					if (err) {
						console.error('Error rolling back client', err.stack);
					}
					// release the client back to the pool
					done();
				});

				reject(err.message);
			}
			return !!err;
		};

		client.query('BEGIN', err => {
			if (shouldAbort(err)) return;
			let selectsql =
					'SELECT a1.id audit_id, p1.id products_id , p1.name productname,p1.barcode productbarcode,p1.serial_number,p1.comments,p1.description,a1.datefinished,s1.name status,l1.name locations,c1.name category, ' +
					'a1.audit_nameid,a1.audit_typeid '+
					'FROM scanapp_testing_audit a1 '+
					'LEFT JOIN scanapp_testing_products p1 on(p1.id=a1.products_id) ' +
					'LEFT JOIN scanapp_testing_statuses s1 on (s1.id=a1.status_id) '+
					'LEFT JOIN scanapp_testing_locations l1 on (l1.id=a1.locations_id) '+
					'LEFT JOIN scanapp_testing_productcategories c1 on (c1.id=p1.productcategories_id) '+
					'WHERE a1.dateexpired IS NULL AND a1.userscreated_id=$1 AND a1.datefinished is not null ORDER BY a1.id  ' +
					'LIMIT $2 OFFSET $3';
			let params = [
				__.sanitiseAsBigInt(data.user_id),
				!__.isUNB(data.length) ? data.length : '10', 
				!__.isUNB(data.offset) ? data.offset : '0'
			];
			client.query(selectsql, params, (err, result) => {
				global.ConsoleLog(selectsql);
				global.ConsoleLog(params);
				global.ConsoleLog(err);
				global.ConsoleLog(result);
				if (shouldAbort(err)) return;

				client.query('COMMIT', err => {
					//done();
					if (err) {
						console.error('Error committing transaction', err.stack);
						//reject('Error committing transaction', err.stack);
					} else {
						// global.ConsoleLog(result.rows[0]['datefinished']);
						// let datefinished = global.moment(result.rows[0]['datefinished']).format('YYYY-MM-DD HH:mm');
						// global.ConsoleLog(datefinished);
						let list  = result.rows;
						for (var i = 0;i<list.length;i++)
						{
							list[i].datefinished = global.moment(list[i].datefinished).format('YYYY-MM-DD HH:mm');
						}
						global.ConsoleLog(list);
						resolve(list);							
					}
				});
			});
		});
	});
}

function doGetAuditUnscanned(client,data)
{
	global.ConsoleLog("doGetAuditUnscanned");
	return new Promise((resolve, reject) => {
		const shouldAbort = err => {
			if (err) {
				console.error('Error in transaction', err.stack);
				client.query('ROLLBACK', err => {
					if (err) {
						console.error('Error rolling back client', err.stack);
					}
					// release the client back to the pool
					done();
				});

				reject(err.message);
			}
			return !!err;
		};

		client.query('BEGIN', err => {
			if (shouldAbort(err)) return;
			let selectsql =
					'SELECT a1.id audit_id, p1.id products_id, p1.name productname,p1.barcode productbarcode,p1.serial_number,p1.comments,p1.description,a1.datefinished,s1.name status,l1.name locations,c1.name category, ' +
					'a1.audit_nameid,a1.audit_typeid '+
					'FROM scanapp_testing_audit a1 '+
					'LEFT JOIN scanapp_testing_products p1 on(p1.id=a1.products_id) ' +
					'LEFT JOIN scanapp_testing_statuses s1 on (s1.id=a1.status_id) '+
					'LEFT JOIN scanapp_testing_locations l1 on (l1.id=a1.locations_id) '+
					'LEFT JOIN scanapp_testing_productcategories c1 on (c1.id=p1.productcategories_id) '+
					'WHERE a1.dateexpired IS NULL AND a1.userscreated_id=$1 AND a1.datefinished is null ORDER BY a1.id  ' +
					'LIMIT $2 OFFSET $3';
			let params = [
				__.sanitiseAsBigInt(data.user_id),
				!__.isUNB(data.length) ? data.length : '10', 
				!__.isUNB(data.offset) ? data.offset : '0'
			];
			client.query(selectsql, params, (err, result) => {
				global.ConsoleLog(selectsql);
				global.ConsoleLog(params);
				global.ConsoleLog(err);
				global.ConsoleLog(result);
				if (shouldAbort(err)) return;

				client.query('COMMIT', err => {
					//done();
					if (err) {
						console.error('Error committing transaction', err.stack);
						reject('Error committing transaction', err.stack);
					} else {
						// global.ConsoleLog(result.rows[0]['datefinished']);
						// let datefinished = global.moment(result.rows[0]['datefinished']).format('YYYY-MM-DD HH:mm');
						// global.ConsoleLog(datefinished);
						global.ConsoleLog(result.rows[0]);
						resolve(result.rows);							
					}
				});
			});
		});
	});
}

function doGetAuditDetail(client,tablename,id)
{
	global.ConsoleLog("doGetAuditDetail");
	global.ConsoleLog(tablename);
	return new Promise((resolve, reject) => {

		const shouldAbort = err => {
			if (err) {
				console.error('Error in transaction', err.stack);
				client.query('ROLLBACK', err => {
					if (err) {
						console.error('Error rolling back client', err.stack);
					}
					// release the client back to the pool
					done();
				});

				reject(err.message);
			}
			return !!err;
		};

		client.query('BEGIN', err => {
			if (shouldAbort(err)) return;
			let selectsql =
				'select name from ' + tablename + ' where id = $1';
			let params = [
				__.sanitiseAsBigInt(id),
			];
			client.query(selectsql, params, (err, result) => {
				global.ConsoleLog(selectsql);
				global.ConsoleLog(params);
				global.ConsoleLog(err);
				global.ConsoleLog(result);
				if (shouldAbort(err)) return;

				client.query('COMMIT', err => {
					if (err) {
						console.error('Error committing transaction', err.stack);
						reject('Error committing transaction', err.stack);
					} else {
						// global.ConsoleLog(result.rows[0]['datefinished']);
						// let datefinished = global.moment(result.rows[0]['datefinished']).format('YYYY-MM-DD HH:mm');
						// global.ConsoleLog(datefinished);
						global.ConsoleLog(result.rows[0]);
						resolve(result.rows[0]);		
					}
				});
			});
		});
	});
}

/**
 * This is for 
 * 1. when an scanned product is not the audit list and the user decided to add it
 * beside update the product's location/catogry, need to insert an row to the audit list, and mark the datefinihsed to now().
 * 2. when an scanned product is in the auditing list, but it is missing.
 * after the update the product's status, and expired the old audit details from the list 
 * need to insert a new row to the audit list with this product with the new status id
 */
function doInsertAuditList(client,data)
{
	global.ConsoleLog("doInsertAuditList");
	global.ConsoleLog(data.audit_nameid);
	global.ConsoleLog(data.audit_typeid);
	return new Promise((resolve, reject) => {

		const shouldAbort = err => {
			if (err) {
				console.error('Error in transaction', err.stack);
				client.query('ROLLBACK', err => {
					if (err) {
						console.error('Error rolling back client', err.stack);
					}
					// release the client back to the pool
					done();
				});

				reject(err.message);
			}
			return !!err;
		};

		client.query('BEGIN', err =>{
			if (shouldAbort(err)) 
			{
				return;
			}
			else
			{
				let insertSql =
						'INSERT INTO scanapp_testing_audit(products_id,locations_id,status_id,productcategories_id,audit_nameid,audit_typeid,datefinished,userscreated_id) ' +
						'SELECT p1.id,p1.locations1_id,p1.status_id,productcategories_id,'+data.audit_nameid+', ' + data.audit_typeid +',now(),$2 FROM scanapp_testing_products p1 WHERE p1.dateexpired IS NULL' +
						' AND p1.id = $1 '+
						'returning id';
	
				let params = [
					data.productid,
					data.user_id	
				];
				global.ConsoleLog(insertSql);
				global.ConsoleLog(params);
				client.query(insertSql, params, (err, result) => {
					if (shouldAbort(err)) return;
					global.ConsoleLog(insertSql);
					global.ConsoleLog(params);
					global.ConsoleLog(err);
					global.ConsoleLog(result);
					client.query('COMMIT', err => {
						// done();
						if (err) {
							console.error('Error committing transaction', err.stack);
						} else {
							resolve(result.rows[0]);
						}
					});
				});
			}
			
		});
	});
}


/**
 * This is the function when an scanned product is in the auditing list, but it is missing.
 * after the update the product's status, need to insert a new row to the audit list with this product
 * with the new status id, but need to expire the old audit list. 
 */
function doExpiredAuditProduct(client,data)
{
	global.ConsoleLog("doExpiredAuditProduct");
	return new Promise((resolve,reject) => {
		const shouldAbort = err => {
			if (err) {
				console.error('Error in transaction', err.stack);
				client.query('ROLLBACK', err => {
					if (err) {
						console.error('Error rolling back client', err.stack);
					}
					// release the client back to the pool
					done();
				});

				reject(err.message);
			}
			return !!err;
		};

		client.query('BEGIN', err =>{
			if (shouldAbort(err)) 
			{
				return;
			}
			else
			{
				let updatesql = 'UPDATE scanapp_testing_audit '+
								'SET dateexpired=now() '+
								'WHERE dateexpired is null AND userscreated_id = $1 and products_id = $2 returning id';
				let params = [
					data.user_id,
					__.sanitiseAsBigInt(data.productid),	
				];
				global.ConsoleLog(updatesql);
				global.ConsoleLog(params);
				client.query(updatesql, params, (err, result) => {
					if (shouldAbort(err)) return;
					global.ConsoleLog(updatesql);
					global.ConsoleLog(params);
					global.ConsoleLog(err);
					global.ConsoleLog(result);
					client.query('COMMIT', err => {
						// done();
						if (err) {
							console.error('Error committing transaction', err.stack);
						} else {
							//global.ConsoleLog(result.rows[0]['datefinished']);
							//result.rows[0]['datefinished'] = global.moment(result.rows[0]['datefinished']).format('YYYY-MM-DD HH:mm');
							// let datefinished = global.moment(result.rows[0]['datefinished']).format('YYYY-MM-DD HH:mm');
							// global.ConsoleLog(datefinished);
							global.ConsoleLog(result.rows)
							if(result.rows.length == 1)
							{
								resolve({errorcode:0});
							}
							// else
							// {
							// 	reject({errorcode:1,message:global.text_unablegetuserauthdetails});
							// }
						}
					});
				});
			}
			
		});
	
	});
}


function doGetUserAuthDetails(client,username)
{
	global.ConsoleLog("doGetUserAuthDetails");
	return new Promise((resolve,reject) => {
		const shouldAbort = err => {
			if (err) {
				console.error('Error in transaction', err.stack);
				client.query('ROLLBACK', err => {
					if (err) {
						console.error('Error rolling back client', err.stack);
					}
					// release the client back to the pool
					done();
				});

				reject(err.message);
			}
			return !!err;
		};

		client.query('BEGIN', err =>{
			if (shouldAbort(err)) 
			{
				return;
			}
			else
			{
				let selectsql = 
					'select ' +
					'u1.id,' +
					'u1.uid,' +
					'u1.uuid,' +
					'u1.email,' +
					'u1.name uname,' +
					'u1.isadmin,' +
					'u1.isclient,' +
					'u1.customers_id custid,' +
					'u1.salt,' +
					'u1.pwd,' +
					'u1.avatar,' +
					'u1.canvieworders,' +
					'u1.cancreateorders,' +
					'u1.canviewinvoices,' +
					'u1.cancreateinvoices,' +
					'u1.canviewproducts,' +
					'u1.cancreateproducts,' +
					'u1.canviewinventory,' +
					'u1.cancreateinventory,' +
					'u1.canviewpayroll,' +
					'u1.cancreatepayroll,' +
					'u1.canviewcodes,' +
					'u1.cancreatecodes,' +
					'u1.canviewclients,' +
					'u1.cancreateclients,' +
					'u1.canviewusers,' +
					'u1.cancreateusers,' +
					'u1.canviewbuilds,' +
					'u1.cancreatebuilds,' +
					'u1.canviewtemplates,' +
					'u1.cancreatetemplates,' +
					'u1.canviewbanking,' +
					'u1.cancreatebanking,' +
					'u1.canviewpurchasing,' +
					'u1.cancreatepurchasing,' +
					'u1.canviewalerts,' +
					'u1.cancreatealerts,' +
					'u1.canviewdashboard,' +
					'u1.cancreatedashboard,' +
					'u1.clients_id clientid ' +
					'from ' +
					'users u1 left join users u2 on (u1.userscreated_id=u2.id) ' +
					'         left join users u3 on (u1.usersmodified_id=u3.id) ' +
					'         left join customers c1 on (u1.customers_id=c1.id) ' +
					'where ' +
					'u1.uid=$1 ' +
					'and ' +
					'u1.dateexpired is null';
				let params = [
					username	
				];
				global.ConsoleLog(selectsql);
				global.ConsoleLog(params);
				client.query(selectsql, params, (err, result) => {
					if (shouldAbort(err)) return;
					global.ConsoleLog(selectsql);
					global.ConsoleLog(params);
					global.ConsoleLog(err);
					global.ConsoleLog(result);
					client.query('COMMIT', err => {
						// done();
						if (err) {
							console.error('Error committing transaction', err.stack);
						} else {
							if(result.rows.length == 1)
							{
								resolve(result.rows[0]);
							}
							else
							{
								reject({errorcode:1,message:global.text_unablegetuserauthdetails});
							}
						}
					});
				});
			}
			
		});


		
	});
}

function doAuthPassword(user,pwd)
{
	global.ConsoleLog("doGetUserAuthDetails");
	return new Promise((resolve,reject) => {
		var sha512 = new global.jssha('SHA-512','TEXT');
		sha512.update(pwd + user.salt);
		if(user.pwd == sha512.getHash('HEX'))
		{
			resolve(user);
		}
		else
		{
			reject({errorcode:1,message:global.text_invalidlogin});
		}
	});
}

function doGetProductById(client,data)
{
	return new Promise((resolve, reject) => {
		if (__.isUNB(data.name) || __.isUNB(data.productid)) {
			reject('Name or ID can not be empty. ');
			return;
		}

		const shouldAbort = err => {
			if (err) {
				console.error('Error in transaction', err.stack);
				client.query('ROLLBACK', err => {
					if (err) {
						console.error('Error rolling back client', err.stack);
					}
					// release the client back to the pool
					done();
				});

				reject(err.message);
			}
			return !!err;
		};

		client.query('BEGIN', err => {
			if (shouldAbort(err)) return;
			global.ConsoleLog(data.serial_number);
			let sql =
				'SELECT p1.id,p1.name,p1.barcode,p1.description,p1.serial_number,p1.locations1_id,p1.status_id,p1.productcategories_id,p1.comments ' +
				'FROM scanapp_testing_products p1 ' +
				'WHERE p1.id=$1';
			let params = [
				__.sanitiseAsBigInt(data.productid)
			];
			client.query(sql, params, (err, result) => {
				global.ConsoleLog(sql);
				global.ConsoleLog(params);
				global.ConsoleLog(err);
				global.ConsoleLog(result);
				if (shouldAbort(err)) return;

				client.query('COMMIT', err => {
					if (err) {
						console.error('Error committing transaction', err.stack);
					} else {
						resolve(result.rows[0]);
					}
				});
			});
		});
	});
}

function doUpdateProductById(client,data)
{
	return new Promise((resolve, reject) => {
		if (__.isUNB(data.name) || __.isUNB(data.productid)) {
			reject('Name or ID can not be empty. ');
			return;
		}

		const shouldAbort = err => {
			if (err) {
				console.error('Error in transaction', err.stack);
				client.query('ROLLBACK', err => {
					if (err) {
						console.error('Error rolling back client', err.stack);
					}
					// release the client back to the pool
					done();
				});

				reject(err.message);
			}
			return !!err;
		};

		client.query('BEGIN', err => {
			if (shouldAbort(err)) return;
			global.ConsoleLog(data.serial_number);
			let sql =
				'UPDATE scanapp_testing_products SET name=$1,serial_number=$2,locations1_id=$3,productcategories_id=$4,status_id=$5,datemodified=now(),usersmodified_id=$6,comments=$7,description=$8 WHERE id=$9 AND dateexpired is null returning name';
			let params = [
				__.sanitiseAsString(data.name, 50),
				__.sanitiseAsString(data.serial_number, 50),
				// data.serial_number,
				__.sanitiseAsBigInt(data.locations1_id),
				__.sanitiseAsBigInt(data.categoryid),
				__.sanitiseAsBigInt(data.status_id),
				data.user_id,
				__.sanitiseAsString(data.comments),
				__.sanitiseAsString(data.description),
				__.sanitiseAsBigInt(data.productid)
			];
			client.query(sql, params, (err, result) => {
				global.ConsoleLog(sql);
				global.ConsoleLog(params);
				global.ConsoleLog(err);
				global.ConsoleLog(result);
				if (shouldAbort(err)) return;

				client.query('COMMIT', err => {
					if (err) {
						console.error('Error committing transaction', err.stack);
					} else {
						resolve(result.rows[0]);
					}
				});
			});
		});
	});
}


// *******************************************************************************************************************************************************************************************
// Public functions
// *******************************************************************************************************************************************************************************************

function GetAllProducts() {
	// return new Promise((resolve, reject) => {
	// 	let sql = 'SELECT p1.id,p1.name, p1.barcode, p1.location FROM products p1';
	// 	// const pool = new Pool({ connectionString });
	// 	global.pg.connect((err, client, done) => {
	// 		if (err) reject('No database connection!');
	// 		client.query(sql, (err, result) => {
	// 			done();
	// 			if (!err) {
	// 				let products = [];
	// 				result.rows.forEach(product => {
	// 					products.push({
	// 						id: _.isNil(product.id) ? '' : product.id,
	// 						name: _.isNil(product.name) ? '' : product.name,
	// 						location: _.isNil(product.location) ? '' : product.location,
	// 						barcode: _.isNil(product.barcode) ? '' : product.barcode
	// 					});
	// 				});
	// 				resolve(products.length ? products : 'No result!');
	// 			} else {
	// 				reject(err);
	// 			}
	// 		});
	// 	});
	// });
}

function Product_Search_Barcode(data) {
	return new Promise((resolve, reject) => {
		if (__.isUNB(data)) {
			reject('Barcode can not be empty.');
			return;
		}

		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server. ');
				} else {
					let barcode = __.sanitiseAsString(data, 200).toUpperCase();
					let sql =
						'SELECT p1.id,p1.name,p1.barcode,p1.description,p1.serial_number,p1.locations1_id,p1.status_id,p1.productcategories_id,p1.comments ' +
						'FROM scanapp_testing_products p1 ' +
						'WHERE p1.barcode=$1';
					let params = [barcode];

					client.query(sql, params, (err, result) => {
						// global.ConsoleLog(sql);
						// global.ConsoleLog(params);
						// global.ConsoleLog(err);
						// global.ConsoleLog(result);
						done();
						err
							? reject(err.message)
							: result.rows.length
							? resolve(result.rows[0])
							: resolve('No result. ');
					});
				}
			}
		);
	});
}

function Product_CheckBarcode(barcode) {
	// return new Promise((resolve, reject) => {
	//     global.pg.connect((err, client, done) => {
	//         if (err) reject('Unable to connect database.');
	//         let sql = 'SELECT * FROM products where barcode=$1 AND dateexpired is null';
	//         let params = [barcode];
	//         client.query(sql, params, (err, result) => {
	//             result.rows.length > 0 ?
	//                 resolve(barcode + ' has existed. ')
	//         })
	//     })
	// })
}

function Product_Register(data) {
	return new Promise((resolve, reject) => {
		if (__.isUNB(data.name) || __.isUNB(data.barcode) || __.isUNB(data.locationid)){
			reject('Name, Barcode or Location can not be empty. ');
			return;
		}
		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server.');
				} else {
					client.query(
						'SELECT * FROM scanapp_testing_products WHERE barcode=$1',
						[__.sanitiseAsString(data.barcode).toUpperCase()],
						(err, result) => {
							if (result.rows.length) {
								done();
								reject('Barcode is existed. ');
							} else {
								const shouldAbort = err => {
									if (err) {
										console.error('Error in transaction', err.stack);
										client.query('ROLLBACK', err => {
											if (err) {
												console.error('Error rolling back client', err.stack);
											}
											// release the client back to the pool
											done();
										});

										reject(err.message);
									}
									return !!err;
								};

								client.query('BEGIN', err => {
									if (shouldAbort(err)) return;

									let sql =
										'INSERT INTO scanapp_testing_products (name,barcode,serial_number,description,locations1_id,productcategories_id,status_id,datecreated,comments,userscreated_id) VALUES($1,$2,$3,$4,$5,$6,$7,now(),$8,$9) returning id';
									let params = [
										__.sanitiseAsString(data.name, 50),
										data.barcode.toUpperCase(),
										__.sanitiseAsString(data.serial_number, 50),
										__.sanitiseAsString(data.description),
										__.sanitiseAsBigInt(data.locationid),
										__.sanitiseAsBigInt(data.categoryid),
										__.sanitiseAsBigInt(data.statusid),
										__.sanitiseAsString(data.comments),
										__.sanitiseAsString(data.user_id),
									];
									client.query(sql, params, (err, result) => {
										if (shouldAbort(err)) return;
										client.query('COMMIT', err => {
											done();
											if (err) {
												console.error('Error committing transaction', err.stack);
											} else {
												resolve(data.name + ' saved. ');
											}
										});
									});
								});
							}
						}
					);
				}
			}
		);
	});
}

function Product_Update(data) {
	// global.ConsoleLog("update product");
	return new Promise((resolve, reject) => {
		if (__.isUNB(data.name) || __.isUNB(data.id)) {
			reject('Name or ID can not be empty. ');
			return;
		}

		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server. ');
				} else {
					const shouldAbort = err => {
						if (err) {
							console.error('Error in transaction', err.stack);
							client.query('ROLLBACK', err => {
								if (err) {
									console.error('Error rolling back client', err.stack);
								}
								// release the client back to the pool
								done();
							});

							reject(err.message);
						}
						return !!err;
					};

					client.query('BEGIN', err => {
						if (shouldAbort(err)) return;
						global.ConsoleLog(data.serial_number);
						let sql =
							'UPDATE scanapp_testing_products SET name=$1,serial_number=$2,locations1_id=$3,productcategories_id=$4,status_id=$5,datemodified=now(),usersmodified_id=$6,comments=$7,description=$8 WHERE id=$9 AND dateexpired is null returning name';
						let params = [
							__.sanitiseAsString(data.name, 50),
							__.sanitiseAsString(data.serial_number, 50),
							// data.serial_number,
							__.sanitiseAsBigInt(data.locationid),
							__.sanitiseAsBigInt(data.categoryid),
							__.sanitiseAsBigInt(data.statusid),
							999,
							__.sanitiseAsString(data.comments),
							__.sanitiseAsString(data.description),
							__.sanitiseAsBigInt(data.id)
						];
						client.query(sql, params, (err, result) => {
							global.ConsoleLog(sql);
							global.ConsoleLog(params);
							global.ConsoleLog(err);
							global.ConsoleLog(result);
							if (shouldAbort(err)) return;

							client.query('COMMIT', err => {
								done();
								if (err) {
									console.error('Error committing transaction', err.stack);
								} else {
									resolve(result.rows[0]);
								}
							});
						});
					});
				}
			}
		);
	});
}

function LocationGetAll() {
	return new Promise((resolve, reject) => {
		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server. ');
					return;
				}

				client.query(
					'SELECT l1.id,l1.name FROM scanapp_testing_locations l1 where dateexpired is null order by id desc',
					(err, results) => {
						done();
						err ? reject(err.message) : resolve(results.rows);
					}
				);
			}
		);
	});
}

function LocationNew(location) {
	return new Promise((resolve, reject) => {
		if (__.isUNB(location.name)) {
			reject('Please insert name!');
		} else {
			// const pool = new Pool({ connectionString });
			global.pg.connect(
				global.cs,
				(err, client, done) => {
					if (err) {
						done();
						reject('Unable to connect server.');
						return;
					}

					const shouldAbort = err => {
						if (err) {
							console.error('Error in transaction', err.stack);
							client.query('ROLLBACK', err => {
								if (err) {
									console.error('Error rolling back client', err.stack);
								}
								// release the client back to the pool
								done();
							});

							reject(err.message);
						}
						return !!err;
					};

					client.query('BEGIN', err => {
						if (shouldAbort(err)) return;

						let insertSql =
							'INSERT INTO scanapp_testing_locations (name, datecreated) VALUES($1, now()) returning id';
						let insertParameters = [__.sanitiseAsString(location.name)];

						client.query(insertSql, insertParameters, (err, result) => {
							if (shouldAbort(err)) return;

							client.query('COMMIT', err => {
								done();
								if (err) {
									console.error('Error committing transaction', err.stack);
								} else {
									resolve(`${location.name} has been saved to server. `);
								}
							});
						});
					});
				}
			);
		}
	});
}

function LocationDelete(locationid) {
	return new Promise((resolve, reject) => {
		if (__.isUNB(locationid)){
			reject('locationid can not be empty.');
			return;
		} 

		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect to server.');
					return;
				}

				const shouldAbort = err => {
					if (err) {
						console.error('Error in transaction', err.stack);
						client.query('ROLLBACK', err => {
							if (err) {
								console.error('Error rolling back client', err.stack);
							}
							// release the client back to the pool
							done();
						});

						reject(err.message);
					}
					return !!err;
				};

				client.query('BEGIN', err => {
					if (shouldAbort(err)) return;

					let sql =
						'Update scanapp_testing_locations SET dateexpired=now() where id=$1 returning name';
					let param = [__.sanitiseAsBigInt(locationid)];

					client.query(sql, param, (err, result) => {
						if (shouldAbort(err)) return;

						client.query('COMMIT', err => {
							done();
							if (err) {
								console.error('Error committing transaction', err.stack);
							} else {
								result.rows.length
									? resolve(`${result.rows[0].name} has been deleted. `)
									: resolve('Location does not exist.');
							}
						});
					});
				});
			}
		);
	});
}

function LocationEdit(location) {
	return new Promise((resolve, reject) => {
		if (__.isUNB(location.name) || __.isUNB(location.id)){
			reject('Name or ID can not be empty.');
			return;
		} 

		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect to server.');
					return;
				}

				const shouldAbort = err => {
					if (err) {
						console.error('Error in transaction', err.stack);
						client.query('ROLLBACK', err => {
							if (err) {
								console.error('Error rolling back client', err.stack);
							}
							// release the client back to the pool
							done();
						});

						reject(err.message);
					}
					return !!err;
				};

				let sql =
					'UPDATE scanapp_testing_locations SET name=$1 where id=$2 AND dateexpired is null returning name';
				let param = [__.sanitiseAsString(location.name, 100), __.sanitiseAsBigInt(location.id)];
				client.query('BEGIN', err => {
					if (shouldAbort(err)) return;

					client.query(sql, param, (err, result) => {
						if (shouldAbort(err)) return;

						client.query('COMMIT', err => {
							done();
							if (err) {
								console.error('Error committing transaction', err.stack);
							} else {
								resolve(`${result.rows[0].name} has been updated. `);
							}
						});
					});
				});
			}
		);
	});
}

function CategoryGetAll() {
	return new Promise((resolve, reject) => {
		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server. ');
					return;
				}

				let sql =
					'SELECT c1.id,c1.name FROM scanapp_testing_productcategories c1 where dateexpired is null order by id desc';
				client.query(sql, (err, result) => {
					done();
					err ? reject(err.message) : resolve(result.rows);
				});
			}
		);
	});
}

function CategoryNew(cat) {
	return new Promise((resolve, reject) => {
		if (__.isUNB(cat.name)){
			reject('Please insert name.');
			return;
		} 

		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server.');
					return;
				}

				const shouldAbort = err => {
					if (err) {
						console.error('Error in transaction', err.stack);
						client.query('ROLLBACK', err => {
							if (err) {
								console.error('Error rolling back client', err.stack);
							}
							// release the client back to the pool
							done();
						});

						reject(err.message);
					}
					return !!err;
				};

				client.query('BEGIN', err => {
					if (shouldAbort(err)) return;

					let sql =
						'INSERT INTO scanapp_testing_productcategories (name,datecreated) VALUES ($1, now())';
					let params = [__.sanitiseAsString(cat.name, 100)];
					client.query(sql, params, (err, result) => {
						if (shouldAbort(err)) return;

						client.query('COMMIT', err => {
							done();
							if (err) {
								console.error('Error committing transaction', err.stack);
							} else {
								resolve(`${cat.name} has been added to server.`);
							}
						});
					});
				});
			}
		);
	});
}

function CategoryDelete(id) {
	return new Promise((resolve, reject) => {
		if (__.isUNB(id)){
			reject('ID can not be empty');
			return;
		} 

		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server.');
					return;
				}

				const shouldAbort = err => {
					if (err) {
						console.error('Error in transaction', err.stack);
						client.query('ROLLBACK', err => {
							if (err) {
								console.error('Error rolling back client', err.stack);
							}
							// release the client back to the pool
							done();
						});

						reject(err.message);
					}
					return !!err;
				};

				client.query('BEGIN', err => {
					if (shouldAbort(err)) return;

					let sql =
						'Update scanapp_testing_productcategories SET dateexpired=now() WHERE dateexpired is null AND id=$1 returning name';
					let params = [__.sanitiseAsBigInt(id)];

					client.query(sql, params, (err, result) => {
						if (shouldAbort(err)) return;

						client.query('COMMIT', err => {
							done();
							if (err) {
								console.error('Error committing transaction', err.stack);
							} else {
								// console.log('object');
								result.rows.length
									? resolve(result.rows[0].name + ' has been deleted. ')
									: resolve('Category does not exist. ');
							}
						});
					});
				});
			}
		);
	});
}

function CategoryEdit(cat) {
	return new Promise((resolve, reject) => {
		if (__.isUNB(cat.name) || __.isUNB(cat.id)){
			reject('Name or ID can not be empty. ');
			return;
		} 

		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server. ');
					return;
				}

				const shouldAbort = err => {
					if (err) {
						console.error('Error in transaction', err.stack);
						client.query('ROLLBACK', err => {
							if (err) {
								console.error('Error rolling back client', err.stack);
							}
							// release the client back to the pool
							done();
						});

						reject(err.message);
					}
					return !!err;
				};

				client.query('BEGIN', err => {
					if (shouldAbort(err)) return;

					let sql =
						'UPDATE scanapp_testing_productcategories SET name=$1 WHERE id=$2 AND dateexpired is null';
					let params = [__.sanitiseAsString(cat.name, 50), __.sanitiseAsBigInt(cat.id)];
					client.query(sql, params, (err, result) => {
						if (shouldAbort(err)) return;

						client.query('COMMIT', err => {
							done();
							if (err) {
								console.error('Error committing transaction', err.stack);
							} else {
								resolve(cat.name + ' has been updated. ');
							}
						});
					});
				});
			}
		);
	});
}

function AuditOnType(data) {
	return new Promise((resolve, reject) => {
		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server.');
				} else {
					const shouldAbort = err => {
						if (err) {
							console.error('Error in transaction', err.stack);
							client.query('ROLLBACK', err => {
								if (err) {
									console.error('Error rolling back client', err.stack);
								}
								// release the client back to the pool
								done();
							});

							reject(err.message);
						}
						return !!err;
					};

					client.query('BEGIN', err => {
						if (shouldAbort(err)) return;

						// let typeid = _.isNil(typeid)? '' : ''+typeid;
						let audit_nameid;
						let audit_typeid;
						
						if(data.type.toUpperCase() == 'ALL')
						{
							audit_nameid = 0;
							audit_typeid = null;
						}
						else if(data.type.toUpperCase() == 'LOCATION')
						{
							audit_nameid = 1;
							audit_typeid = data.typeid;
						}
						else if(data.type.toUpperCase() == 'CATEGORY')
						{
							audit_nameid = 2;
							audit_typeid = data.typeid;
						}
						let condition =
						data.type.toUpperCase() == 'CATEGORY'
								? ' AND productcategories_id=' + data.typeid
								: data.type.toUpperCase() == 'LOCATION'
								? ' AND locations1_id=' + data.typeid
								: '';
						let insertSql =
							'INSERT INTO scanapp_testing_audit(products_id,locations_id,status_id,productcategories_id,audit_nameid,audit_typeid,userscreated_id) ' +
							'SELECT p1.id,p1.locations1_id,p1.status_id,productcategories_id,'+audit_nameid+', ' +audit_typeid +', '+data.user_id + 
							' FROM scanapp_testing_products p1 WHERE p1.dateexpired IS NULL' +
							condition +
							' returning id';
						global.ConsoleLog(insertSql);
						
						client.query(insertSql, (err, result) => {
							if (shouldAbort(err)) return;

							// result.rows.length ? AuditGetList() : reject('Fail to create auditing list.');

							client.query('COMMIT', err => {
								done();
								if (err) {
									console.error('Error committing transaction', err.stack);
								} else 
								{
									if(result.rows.length == 0)
									{
										reject('No result. ');
									}
									else
									{
										doGetAuditScanned(client,data).then(result => 
										{
											let scannedList = result;
											global.ConsoleLog('scannedList');
											global.ConsoleLog(scannedList);
											
											doGetAuditUnscanned(client,data).then(result => 
											{
												done();
												let unscannedList = result;
												global.ConsoleLog('unscannedList')
												global.ConsoleLog(unscannedList);
												resolve({scanned:scannedList,unscanned:unscannedList});
												
											})
											.catch(err => 
											{
											
												reject(err);
											})
										})
										.catch(err => 
										{
										
											reject(err);
										})
									}
								}
							});
						});
					});
				}
			}
		);
	});
}

function AuditDiscardList(data) {
	return new Promise((resolve, reject) => {
		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server. ');
				} else {
					const shouldAbort = err => {
						if (err) {
							console.error('Error in transaction', err.stack);
							client.query('ROLLBACK', err => {
								if (err) {
									console.error('Error rolling back client', err.stack);
								}
								// release the client back to the pool
								done();
							});

							reject(err.message);
						}
						return !!err;
					};

					let sql =
						'UPDATE scanapp_testing_audit SET dateexpired=now() WHERE dateexpired IS NULL AND userscreated_id=$1 returning id';
					let params = [data.userid];
					client.query(sql, params, (err, result) => {
						if (shouldAbort(err)) return;

						client.query('COMMIT', err => {
							done();
							if (err) console.error('Error committing transaction', err.stack);

							result.rows.length ? resolve(result.rows) : reject('No result has been updated. ');
						});
					});
				}
			}
		);
	});
}

function AuditGetAll(data) {
	global.ConsoleLog(data);
	return new Promise((resolve, reject) => {
		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server. ');
					return;
				}

				else 
				{
					doGetAuditScanned(client,data).then(result => 
					{
						
						let scannedList = result;
						global.ConsoleLog(scannedList);
						
						doGetAuditUnscanned(client,data).then(result => 
						{
							// done();
							let audit_nameid;
							let audit_typeid ;
							let unscannedList = result;
							global.ConsoleLog(unscannedList);
							if(scannedList.length > 0)
							{
								audit_nameid = scannedList[0].audit_nameid;
								audit_typeid = scannedList[0].audit_typeid;
								global.ConsoleLog(audit_nameid);
								global.ConsoleLog(audit_typeid);
								if(audit_nameid == 0)
								{
									done();
									resolve({scanned:scannedList,unscanned:unscannedList,audit_name:'ALL',audit_typename:'',audit_nameid:0,audit_typeid:null});
								}
								else 
								{
									var tablename = '';
									var type = '';
									switch(audit_nameid){
										case "1":
											tablename = 'scanapp_testing_locations';
											type = 'Locations'
											break;
										case "2":
											tablename = 'scanapp_testing_productcategories';
											type = 'Categories'
											break;
										default:
											tablename = '';
									}
									global.ConsoleLog(tablename);
									global.ConsoleLog(type);
									doGetAuditDetail(client,tablename,audit_typeid).then(result => 
									{
										done();
										let name = result.name;
										global.ConsoleLog(name);
										resolve({scanned:scannedList,unscanned:unscannedList,audit_name:type,audit_typename:name,audit_nameid:scannedList[0].audit_nameid,audit_typeid:scannedList[0].audit_typeid});
									})
									.catch(err => 
									{
										done();
										reject(err);
									})
								}

							}
							else
							{
								if(unscannedList.length > 0)
								{
									audit_nameid = unscannedList[0].audit_nameid;
									audit_typeid = unscannedList[0].audit_typeid;
									global.ConsoleLog(audit_nameid);
									global.ConsoleLog(audit_typeid);
									if(audit_nameid == 0)
									{
										done();
										resolve({scanned:scannedList,unscanned:unscannedList,audit_name:'ALL',audit_typename:'',audit_nameid:0,audit_typeid:null});
									}
									else 
									{
										var tablename = '';
										var type = '';
										switch(audit_nameid){
											case "1":
												tablename = 'scanapp_testing_locations';
												type = 'Locations'
												break;
											case "2":
												tablename = 'scanapp_testing_productcategories';
												type = 'Categories'
												break;
											default:
												tablename = '';
										}
										global.ConsoleLog(tablename);
										global.ConsoleLog(type);
										doGetAuditDetail(client,tablename,audit_typeid).then(result => 
										{
											done();
											let name = result.name;
											global.ConsoleLog(name);
											resolve({scanned:scannedList,unscanned:unscannedList,audit_name:type,audit_typename:name,audit_nameid:unscannedList[0].audit_nameid,audit_typeid:unscannedList[0].audit_typeid});
										})
										.catch(err => 
										{
											done();
											reject(err);
											
										})
									}
								}
								else
								{
									done();
									resolve({scanned:scannedList,unscanned:unscannedList,audit_nameid:'',audit_name:''});
								}
								
							}
							
						})
						.catch(err => 
						{
							done();
							reject(err);
							
						})
					})
					.catch(err => 
					{
						done();
						reject(err);
					});
				}
			}
		);
	});
}

function AuditGetScanned(data)
{
	global.ConsoleLog('AuditGetScanned');
	return new Promise((resolve, reject) => {
		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server. ');
					return;
				}

				doGetAuditScanned(client,data).then(result => 
				{
					let scannedList = result;
					global.ConsoleLog(scannedList);
					resolve(result);
					
				})
				.catch(err => 
				{
					reject(err);
				});
			}
		);
	});
}

function AuditGetUnscanned(data)
{
	global.ConsoleLog('AuditGetUnscanned');
	return new Promise((resolve, reject) => {
		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server. ');
					return;
				}

				doGetAuditUnscanned(client,data).then(result => 
				{
					let unscannedList = result;
					global.ConsoleLog(unscannedList);
					resolve(result);
					
				})
				.catch(err => 
				{
					reject(err);
				});
			}
		);
	});
}


function Audit_Scan_Barcode(barcode,user_id){
	global.ConsoleLog("Audit Scan barcode");
	return new Promise((resolve, reject) => {
		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server.');
				} 
				else 
				{
					doCheckAuditList(client,barcode,user_id).then(result => 
					{
						// global.ConsoleLog(result);
						if(result.length == 1)
						{
							let auditDetail = result[0]
							let auditid = auditDetail.id;
							// global.ConsoleLog(auditDetail.datefinished);

							if(!__.isUN(auditDetail.datefinished))
							{
								done();
								auditDetail.datefinished = global.moment(auditDetail.datefinished).format('YYYY-MM-DD HH:mm');
								reject({errorcode:3,message:'This barcode has been audited',data:auditDetail,});
							}
							else
							{
								//Barcode is in the list but never been scanned before. 
								doUpdateAuditList(client,auditid).then(result => 
								{
									done();
									// global.ConsoleLog(result);
									auditDetail.datefinished = result.datefinished;
									// global.ConsoleLog(auditDetail)
									if(result.status_id == 3)
									{
										reject({errorcode:4,message:'The scanned product is in the audit list but it is missing',data:auditDetail});								
									}
									else
									{
										resolve({errorcode:0,message:'audit successed',data:auditDetail});							
									}
								})
								.catch(err => 
								{
									done();
									reject(err);
								})
							}
							// global.ConsoleLog(result[0].id);
							// resolve(result[0]);
						}
						else
						{
							global.ConsoleLog("the scanned barcode is not in the list");
							// resolve({errorcode:1,message:'The scanned barcode is not in the to-be-audit list'});	
							// resolve("The scanned barcode is not in the to-be-audit list");
							doGetBarcodeDetails(client,barcode).then(result => 
							{
								done();
								// global.ConsoleLog(result);
								if(result.length > 0)
								{
									if(result[0].status_id == 3)
									{
										reject({errorcode:5,message:'The scanned barcode is not in the to-be-audit list and missing',data:result[0]});								
									}	
									else
									{
										reject({errorcode:1,message:'The scanned barcode is not in the to-be-audit list',data:result[0]});								
									}
								}
								else
								{
									reject({errorcode:2,message:'The scanned product has not been registered'});
								}
								
							})
							.catch(err => 
							{
								done();
								reject(err);
							})
						}
					
					})
					.catch(err => 
					{
						done();
						reject(err);
					})

					
				}
		}
		);
	});
}

 /**
 * During an audit, if the user scann a barcode which is not in the audit list,but has been registered, he can choose 'Add', 
 * so this product will be changed to the current auditing location or category automatically
 * without changing to another page in the frontend. one-stop-saction. 
 */
function Audit_UpdateProduct(data)
{
	return new Promise((resolve, reject) => {
		if ( __.isUNB(data.productid)) {
			reject('product ID can not be empty. ');
			return;
		}

		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server.');
				} else {
					const shouldAbort = err => {
						if (err) {
							console.error('Error in transaction', err.stack);
							client.query('ROLLBACK', err => {
								if (err) {
									console.error('Error rolling back client', err.stack);
								}
								// release the client back to the pool
								done();
							});

							reject(err.message);
						}
						return !!err;
					};

					client.query('BEGIN', err => {
						if (shouldAbort(err)) return;

						// global.ConsoleLog(data);
						let params = [];
						let updatesql = '';
						let locations1_id = null;
						let productcategories_id = null;
						let status_id = null;

						if(data.errorcode == 1)
						{
							//product is not in the audit list

							if(!__.isUNB(data.locations1_id))
							{
								updatesql = 'UPDATE scanapp_testing_products '+
								'SET datemodified=now(),usersmodified_id=$1,locations1_id = $3 '+
								'WHERE id=$2 AND dateexpired is null returning id';

								params = [
									data.user_id,
									__.sanitiseAsBigInt(data.productid),
									locations1_id = __.sanitiseAsBigInt(data.locations1_id),
								];
							}
							else if (!__.isUNB(data.productcategories_id))
							{
								updatesql = 'UPDATE scanapp_testing_products '+
								'SET datemodified=now(),usersmodified_id=$1,productcategories_id = $3 '+
								'WHERE id=$2 AND dateexpired is null returning id';

								params = [
									data.user_id,
									__.sanitiseAsBigInt(data.productid),
									__.sanitiseAsBigInt(data.productcategories_id),
								];
							}
						}
						else if (data.errorcode == 4)
						{
							//product is in the audit list, but it is missing, so only update the status id. 
							updatesql = 'UPDATE scanapp_testing_products '+
								'SET datemodified=now(),usersmodified_id=$1,status_id = 1 '+
								'WHERE id=$2 AND dateexpired is null returning id';

							params = [
								data.user_id,
								__.sanitiseAsBigInt(data.productid),
								// __.sanitiseAsBigInt(data.status_id),
							];
						}
						else if (data.errorcode == 5)
						{
							//product is not in the audit list,and it is missing, so update the status id and others. 

							if(!__.isUNB(data.locations1_id))
							{
								updatesql = 'UPDATE scanapp_testing_products '+
								'SET datemodified=now(),usersmodified_id=$1,locations1_id = $3,status_id = 1 '+
								'WHERE id=$2 AND dateexpired is null returning id';

								params = [
									data.user_id,
									__.sanitiseAsBigInt(data.productid),
									locations1_id = __.sanitiseAsBigInt(data.locations1_id),
									// __.sanitiseAsBigInt(data.status_id),
								];
							}
							else if (!__.isUNB(data.productcategories_id))
							{
								updatesql = 'UPDATE scanapp_testing_products '+
								'SET datemodified=now(),usersmodified_id=$1,productcategories_id = $3,status_id = 1 '+
								'WHERE id=$2 AND dateexpired is null returning id';

								params = [
									data.user_id,
									__.sanitiseAsBigInt(data.productid),
									__.sanitiseAsBigInt(data.productcategories_id),
									// __.sanitiseAsBigInt(data.status_id)
								];
							}
						}

						global.ConsoleLog(updatesql);
						global.ConsoleLog(params);

						client.query(updatesql,params, (err, result) => {
							if (shouldAbort(err)) return;
							global.ConsoleLog(updatesql);
							global.ConsoleLog(params);
							global.ConsoleLog(err);
							global.ConsoleLog(result);

							client.query('COMMIT', err => {
								if (err) {
									done();
									console.error('Error committing transaction', err.stack);
								} else {
									global.ConsoleLog(result);
									if(data.errorcode == 4)
									{
										//done();
										doExpiredAuditProduct(client,data).then(result =>
										{
											global.ConsoleLog(result);
											doInsertAuditList(client,data).then(result => 
											{
												done();
												//let unscannedList = result;
												global.ConsoleLog(result);
												resolve({errorcode:0,message:'update successfully',data:result});
											})
											.catch(err => 
											{
												done();
												reject(err);
											});
										})
										.catch(err =>
										{
											done();
											reject(err);	
										});
										//resolve({errorcode:0,message:'update successfully',data:result.rows});
									}
									else
									{
										doInsertAuditList(client,data).then(result => 
										{
											done();
											//let unscannedList = result;
											global.ConsoleLog(result);
											resolve({errorcode:0,message:'update successfully',data:result});
										})
										.catch(err => 
										{
											done();
											reject(err);
										});
									}
								}
							});
						});						
					});
				}
			}
		);
	});
}

 /**
 * During an audit, if the user scan a barcode which has not been registered, he can choose 'Register', 
 * so this product will be registered to the database. If it is audit 'All', or if the registered location or category is 
 * matched with the audited condition, this product will be added to the audit list automatically. 
 */
function Audit_RegisterProduct(data)
{
	return new Promise((resolve, reject) => {
		if (__.isUNB(data.name) || __.isUNB(data.barcode) || __.isUNB(data.locations1_id)){
			reject('Name, Barcode or Location can not be empty. ');
			return;
		}

		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server.');
				} else {
					doRegisterProduct(client,data).then(result =>
					{
						data.productid = result.id;
						global.ConsoleLog(data.productid);
						let insert = false;
						if(data.audit_nameid == 0)
						{
							insert = true;
						}
						else if(data.audit_nameid == 1 && data.audit_typeid == data.locations1_id)
						{
							insert = true;
						}
						else if(data.audit_nameid == 2 && data.audit_typeid == data.categoryid)
						{
							insert = true;
						}

						if(insert)
						{
							doInsertAuditList(client,data).then(result => 
							{
								done();
								//let unscannedList = result;
								global.ConsoleLog(result);
								resolve({errorcode:0,message:'register product successfully',data:result});
							})
							.catch(err => 
							{
								done();
								reject(err);
							});
						}
						else
						{
							done();
							//let unscannedList = result;
							global.ConsoleLog(result);
							resolve({errorcode:0,message:'register product successfully',data:result});
						}
					})
					.catch(err =>
					{
						done();
						reject(err);
					});
				}
			}
		);
	});
}

 /**
 * During an audit, the user scann a barcode which is not in the audit list,but has been registered. 
 * Or it is in the audit list but it is missing. 
 * The user will be presented two options. 'Add' and 'Edit'. 
 * If choose 'Edit', this function will be used. 
 * User can modify any infomation of this product and update all together. 
 */
function Audit_EditProduct(data)
{
	global.ConsoleLog('Audit_EditProduct');
	return new Promise((resolve, reject) => {
		if ( __.isUNB(data.productid)) {
			reject('product ID can not be empty. ');
			return;
		}
		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server.');
				} else {

					doUpdateProductById(client,data).then(result =>
					{
						if(data.errorcode == 4 && data.status_id != 3)
						{
							doExpiredAuditProduct(client,data).then(result =>
							{
								global.ConsoleLog(result);
								doInsertAuditList(client,data).then(result => 
								{
									done();
									//let unscannedList = result;
									global.ConsoleLog(result);
									resolve({errorcode:0,message:'update successfully',data:result});
								})
								.catch(err => 
								{
									done();
									reject(err);
								});
							})
							.catch(err =>
							{
								done();
								reject(err);
							});
						}
						else if(data.errorcode == 1 || data.errorcode == 5)
						{
							let insert = false;
							if(data.audit_nameid == 0)
							{
								insert = true;
							}
							else if(data.audit_nameid == 1 && data.audit_typeid == data.locations1_id)
							{
								insert = true;
							}
							else if(data.audit_nameid == 2 && data.audit_typeid == data.categoryid)
							{
								insert = true;
							}

							if(insert)
							{
								doInsertAuditList(client,data).then(result => 
								{
									done();
									//let unscannedList = result;
									global.ConsoleLog(result);
									resolve({errorcode:0,message:'update successfully',data:result});
								})
								.catch(err => 
								{
									done();
									reject(err);
								});
							}
							else
							{
								done();
								//let unscannedList = result;
								global.ConsoleLog(result);
								resolve({errorcode:0,message:'update successfully',data:result});
							}

						}
					})
					.catch(err =>
					{
						done();
						reject(err);
					});
				}
			}
		);
	});
}

function LoginUser(username,pwd)
{
	global.ConsoleLog("LoginUser");
	global.ConsoleLog(username);
	global.ConsoleLog(pwd);
	return new Promise((resolve,reject) => {
		global.pg.connect(
			global.cs,
			(err,client,done) => {
				if(err){
					done();
					reject('Unable to connect server.');
				}
				else
				{
					doGetUserAuthDetails(client,username).then(result => 
					{
						global.ConsoleLog(result);
						let user = result;
						doAuthPassword(user,pwd).then(result =>
						{
							done();
							global.ConsoleLog(result);
							resolve({errorcode:0,uid:result.uid.toUpperCase(),id:result.id,message:"Log in successfully"});
							
						})
						.catch(err =>
						{
							done();
							reject(err);
						})
					})
					.catch(err => 
					{
						done();
						reject(err);
					})

				}
			}	
		);
	});
}


function StatusGetAll() {
	return new Promise((resolve, reject) => {
		global.pg.connect(
			global.cs,
			(err, client, done) => {
				if (err) {
					done();
					reject('Unable to connect server. ');
					return;
				}

				let sql =
					'SELECT s1.id,s1.name FROM scanapp_testing_statuses s1 where dateexpired is null order by id asc';
				client.query(sql, (err, result) => {
					done();
					err ? reject(err.message) : resolve(result.rows);
				});
			}
		);
	});
}
// *******************************************************************************************************************************************************************************************
// Internal functions
module.exports.doUpdateAuditList = doUpdateAuditList;
module.exports.doUpdateAuditList = doUpdateAuditList;
module.exports.doGetAuditScanned = doGetAuditScanned;
module.exports.doGetAuditUnscanned = doGetAuditUnscanned;
module.exports.doInsertAuditList = doInsertAuditList;
module.exports.doGetUserAuthDetails = doGetUserAuthDetails;
module.exports.doExpiredAuditProduct = doExpiredAuditProduct;
module.exports.doAuthPassword = doAuthPassword;


// *******************************************************************************************************************************************************************************************
// Public functions
module.exports.Product_CheckBarcode = Product_CheckBarcode;
module.exports.Product_Search_Barcode = Product_Search_Barcode;
module.exports.Product_Register = Product_Register;
module.exports.Product_Update = Product_Update;
module.exports.GetAllProducts = GetAllProducts;
module.exports.LocationGetAll = LocationGetAll;
module.exports.LocationNew = LocationNew;
module.exports.LocationDelete = LocationDelete;
module.exports.LocationEdit = LocationEdit;
module.exports.CategoryGetAll = CategoryGetAll;
module.exports.CategoryNew = CategoryNew;
module.exports.CategoryDelete = CategoryDelete;
module.exports.CategoryEdit = CategoryEdit;
module.exports.StatusGetAll = StatusGetAll;
module.exports.AuditOnType = AuditOnType;
module.exports.AuditDiscardList = AuditDiscardList;
module.exports.AuditGetAll = AuditGetAll;
module.exports.Audit_Scan_Barcode = Audit_Scan_Barcode;
module.exports.Audit_UpdateProduct = Audit_UpdateProduct;
module.exports.Audit_EditProduct = Audit_EditProduct;
module.exports.Audit_RegisterProduct = Audit_RegisterProduct;
module.exports.AuditGetScanned = AuditGetScanned;
module.exports.AuditGetUnscanned = AuditGetUnscanned;
module.exports.LoginUser = LoginUser;
