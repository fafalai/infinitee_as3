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

/**
 * This is the function to check whether the scanned barcode is in the audit list
 */
function doCheckAuditList(client,barcode,userscreated_id)
{
	global.ConsoleLog("doCheckAuditList");
	return new Promise((resolve, reject) => {
		let selectsql =
		'select a1.id,a1.products_id,a1.datefinished,p1.barcode ,p1.name,p1.comments,' +
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
			userscreated_id,	
		];
		client.query(selectsql, params, (err, result) => {
			// global.ConsoleLog(selectsql);
			// global.ConsoleLog(params);
			// global.ConsoleLog(err);
			//global.ConsoleLog(result);

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
}

/** 
 * This is the function called when the scanned barcode is in the audit list. Use this function to update the product in the audite list to be 'audited'
*/
function doUpdateAuditList(client,auditid)
{
	global.ConsoleLog("doUpdateAuditList");
	return new Promise((resolve, reject) => {
		let updatesql =
				'UPDATE scanapp_testing_audit ' + 
				'SET datefinished=now() '+
				'where id = $1 '+
				'returning datefinished,products_id,status_id ';
		let params = [
			auditid	
		];
		client.query(updatesql, params, (err, result) => {
			// global.ConsoleLog(updatesql);
			// global.ConsoleLog(params);
			// global.ConsoleLog(err);
			// global.ConsoleLog(result);

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
}

/**
 * This is the function used when the scanned barcode is not in the to-be-audit list, and hasn't been audited before. Use it to get the product detail for next move. 
 */
function doGetBarcodeDetails(client,barcode)
{
	global.ConsoleLog("doGetBarcodeDetails");
	return new Promise((resolve, reject) => {
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
			// global.ConsoleLog(selectsql);
			// global.ConsoleLog(params);
			// global.ConsoleLog(err);
			// global.ConsoleLog(result);

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
}
/**
 * 
 */
function doGetAuditScanned(client,data)
{
	global.ConsoleLog("doGetAuditScanned");
	return new Promise((resolve, reject) => {
		let selectsql =
					'SELECT p1.id, p1.name productname,p1.barcode productbarcode,p1.serial_number,p1.comments,p1.description,a1.datefinished,s1.name status,l1.name locations,c1.name category ' +
					'FROM scanapp_testing_audit a1 '+
					'LEFT JOIN scanapp_testing_products p1 on(p1.id=a1.products_id) ' +
					'LEFT JOIN scanapp_testing_statuses s1 on (s1.id=a1.status_id) '+
					'LEFT JOIN scanapp_testing_locations l1 on (l1.id=a1.locations_id) '+
					'LEFT JOIN scanapp_testing_productcategories c1 on (c1.id=p1.productcategories_id) '+
					'WHERE a1.dateexpired IS NULL AND a1.userscreated_id=$1 AND a1.datefinished is not null ORDER BY a1.id  ' +
					'LIMIT $2 OFFSET $3';
				let params = [
					__.sanitiseAsBigInt(data.userscreated_id),
					!__.isUNB(data.length) ? data.length : '10', 
					!__.isUNB(data.offset) ? data.offset : '0'
				];
				client.query(selectsql, params, (err, result) => {
					global.ConsoleLog(selectsql);
					global.ConsoleLog(params);
					global.ConsoleLog(err);
					// global.ConsoleLog(result);

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
		// global.pg.connect(
		// 	global.cs,
		// 	(err, client, done) => {
		// 		if (err) {
		// 			done();
		// 			reject('Unable to connect server. ');
		// 			return;
		// 		}

				
		// 	}
		// );
	});
}

function doGetAuditUnscanned(client,data)
{
	global.ConsoleLog("doGetAuditUnscanned");
	return new Promise((resolve, reject) => {
		let selectsql =
						'SELECT p1.id, p1.name productname,p1.barcode productbarcode,p1.serial_number,p1.comments,p1.description,a1.datefinished,s1.name status,l1.name locations,c1.name category ' +
						'FROM scanapp_testing_audit a1 '+
						'LEFT JOIN scanapp_testing_products p1 on(p1.id=a1.products_id) ' +
						'LEFT JOIN scanapp_testing_statuses s1 on (s1.id=a1.status_id) '+
						'LEFT JOIN scanapp_testing_locations l1 on (l1.id=a1.locations_id) '+
						'LEFT JOIN scanapp_testing_productcategories c1 on (c1.id=p1.productcategories_id) '+
						'WHERE a1.dateexpired IS NULL AND a1.userscreated_id=$1 AND a1.datefinished is null ORDER BY a1.id  ' +
						'LIMIT $2 OFFSET $3';
				let params = [
					__.sanitiseAsBigInt(data.userscreated_id),
					!__.isUNB(data.length) ? data.length : '10', 
					!__.isUNB(data.offset) ? data.offset : '0'
				];

				client.query(selectsql, params, (err, result) => {
					global.ConsoleLog(selectsql);
					global.ConsoleLog(params);
					global.ConsoleLog(err);
					global.ConsoleLog(result);

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
		// global.pg.connect(
		// 	global.cs,
		// 	(err, client, done) => {
		// 		if (err) {
		// 			done();
		// 			reject('Unable to connect server. ');
		// 			return;
		// 		}

				
		// 	}
		// );
	});
}



// *******************************************************************************************************************************************************************************************
// Public functions
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
										'INSERT INTO scanapp_testing_products (name,barcode,serial_number,description,locations1_id,productcategories_id,status_id,datecreated,comments) VALUES($1,$2,$3,$4,$5,$6,$7,now(),$8) returning id';
									let params = [
										__.sanitiseAsString(data.name, 50),
										data.barcode.toUpperCase(),
										__.sanitiseAsString(data.serial_number, 50),
										__.sanitiseAsString(data.description),
										__.sanitiseAsBigInt(data.locationid),
										__.sanitiseAsBigInt(data.categoryid),
										__.sanitiseAsBigInt(data.statusid),
										__.sanitiseAsString(data.comments),
									];

									client.query(sql, params, (err, result) => {
										if (shouldAbort(err)) return;

										let productid = result.rows[0].id;
										let sql2 =
											'INSERT INTO scanapp_testing_inventory(products_id,locations_id,status_id,datecreated) VALUES($1,$2,$3,now())';
										let params2 = [productid, data.locationid, data.statusid];
										client.query(sql2, params2, (err, result2) => {
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
						let condition =
						data.type.toUpperCase() == 'CATEGORY'
								? ' AND productcategories_id=' + data.typeid
								: data.type.toUpperCase() == 'LOCATION'
								? ' AND locations1_id=' + data.typeid
								: '';
						let insertSql =
							'INSERT INTO scanapp_testing_audit(products_id,locations_id,status_id) ' +
							'SELECT p1.id,p1.locations1_id,p1.status_id FROM scanapp_testing_products p1 WHERE p1.dateexpired IS NULL' +
							condition +
							' returning id';
						client.query(insertSql, (err, result) => {
							if (shouldAbort(err)) return;

							// result.rows.length ? AuditGetList() : reject('Fail to create auditing list.');

							client.query('COMMIT', err => {
								done();
								if (err) {
									console.error('Error committing transaction', err.stack);
								} else {
									result.rows.length
										? AuditGetAll(data)
												.then(result => {
													resolve(result);
												})
												.catch(err => {
													reject(err);
												})
										: reject('No result. ');
								}
							});
						});
					});
				}
			}
		);
	});
}

function AuditDiscardList() {
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
					let params = ['999'];
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

					doGetAuditScanned(client,data).then(result => 
					{
						
						let scannedList = result;
						global.ConsoleLog(scannedList);
						
						doGetAuditUnscanned(client,data).then(result => 
						{
							done();
							let unscannedList = result;
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

				// let sql =
				// 	'SELECT p1.id, p1.name productname,p1.barcode productbarcode,p1.serial_number,p1.comments,p1.description,a1.datefinished,s1.name status,l1.name locations,c1.name category ' +
				// 	'FROM scanapp_testing_audit a1 '+
				// 	'LEFT JOIN scanapp_testing_products p1 on(p1.id=a1.products_id) ' +
				// 	'LEFT JOIN scanapp_testing_statuses s1 on (s1.id=a1.status_id) '+
				// 	'LEFT JOIN scanapp_testing_locations l1 on (l1.id=a1.locations_id) '+
				// 	'LEFT JOIN scanapp_testing_productcategories c1 on (c1.id=p1.productcategories_id) '+
				// 	'WHERE a1.dateexpired IS NULL AND a1.userscreated_id=$1 ORDER BY a1.id ' +
				// 	'LIMIT $2 OFFSET $3';
				// let params = [__.sanitiseAsBigInt(audit.userscreated_id),!__.isUNB(audit.length) ? audit.length : '10', !__.isUNB(audit.offset) ? audit.offset : '0'];
				// global.ConsoleLog(sql);
				// global.ConsoleLog(params);
				// client.query(sql, params, (err, result) => {
				// 	done();
				// 	if (err) {
				// 		reject('Error get audit list. ');
				// 	} else {
				// 		let audited = [];
				// 		let unaudited = [];
				// 		for (var i = 0;i<result.rows.length;i++)
				// 		{
				// 			if(!__.isUNB(result.rows[i].datefinished))
				// 			{
				// 				audited.push(result.rows[i]);
				// 			}
				// 			else
				// 			{
				// 				unaudited.push(result.rows[i]);
				// 			}

				// 		}
				// 		global.ConsoleLog(audited);
				// 		global.ConsoleLog(unaudited);
				// 		resolve(result.rows);
				// 	}
				// 	// err ? reject('Error get audit list. ') : resolve(result.rows);
				// });
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


function Audit_Scan_Barcode(barcode,userscreated_id){
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

					doCheckAuditList(client,barcode,userscreated_id).then(result => 
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
										reject({errorcode:4,message:'The scanned product is missing',data:auditDetail});								
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
								reject(err);
							})
						}
					
					})
					.catch(err => 
					{
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

 /**
 * During an audit, if the user scann a barcode which is not in the audit list,but has been registered, he can choose 'Add', 
 * so this product will be changed to the current auditing location or category automatically
 * without changing to another page in the frontend. one-stop-saction. 
 */
function Audit_UpdateProduct(data)
{
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

						// global.ConsoleLog(data);
						let sql = '';
						let locations1_id = null;
						let productcategories_id = null;
						let status_id = null;
						let params = [];
						if(!__.isUNB(data.locations1_id))
						{
							sql = ',locations1_id = $1 '
							locations1_id = __.sanitiseAsBigInt(data.locations1_id);
							params = [
								locations1_id,
								data.usermodified_id,
								__.sanitiseAsBigInt(data.productid)
							];
						}
						else if(!__.isUNB(data.productcategories_id))
						{
							sql = ',productcategories_id = $1 '
							productcategories_id = __.sanitiseAsBigInt(data.productcategories_id);
							params = [
								productcategories_id,
								data.usermodified_id,
								__.sanitiseAsBigInt(data.productid)
							];

						}

						if(!__.isUNB(data.status_id))
						{
							sql = sql + ',status_id = $1 '
							status_id = __.sanitiseAsBigInt(data.status_id);
							params = [
								status_id,
								data.usermodified_id,
								__.sanitiseAsBigInt(data.productid)
							];

						}

						// let typeid = _.isNil(typeid)? '' : ''+typeid;
						let updatesql = 
								'UPDATE scanapp_testing_products '+
								'SET datemodified=now(),usersmodified_id=$2 '+
								 sql +
								'WHERE id=$3 AND dateexpired is null returning id';

						global.ConsoleLog(params);
						
						client.query(updatesql,params, (err, result) => {
							if (shouldAbort(err)) return;
							// global.ConsoleLog(updatesql);
							// global.ConsoleLog(params);
							// global.ConsoleLog(err);
							// global.ConsoleLog(result);
							// result.rows.length ? AuditGetList() : reject('Fail to create auditing list.');

							client.query('COMMIT', err => {
								done();
								if (err) {
									console.error('Error committing transaction', err.stack);
								} else {
									global.ConsoleLog(result);
									resolve({errorcode:0,message:'update successfully',data:result.rows});
								}
							});
						});
					});
				}
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
module.exports.AuditGetScanned = AuditGetScanned;
module.exports.AuditGetUnscanned = AuditGetUnscanned;
