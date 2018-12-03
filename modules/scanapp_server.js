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
										data.serialnumber,
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

						let sql =
							'UPDATE scanapp_testing_products SET name=$1,serial_number=$2,locations1_id=$3,productcategories_id=$4,status_id=$5,datemodified=now(),usersmodified_id=$6,comments=$7,description=$8 WHERE id=$9 AND dateexpired is null returning name';
						let params = [
							__.sanitiseAsString(data.name, 50),
							data.serial_number,
							__.sanitiseAsBigInt(data.locationid),
							__.sanitiseAsBigInt(data.categoryid),
							__.sanitiseAsBigInt(data.statusid),
							999,
							__.sanitiseAsString(data.comments),
							__.sanitiseAsString(data.description),
							__.sanitiseAsBigInt(data.id)
						];
						client.query(sql, params, (err, result) => {
							// global.ConsoleLog(sql);
							 global.ConsoleLog(params);
							// global.ConsoleLog(err);
							// global.ConsoleLog(result);
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

function AuditOnType(type, typeid) {
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
							type.toUpperCase() == 'CATEGORY'
								? ' AND productcategories_id=' + typeid
								: type.toUpperCase() == 'LOCATION'
								? ' AND locations1_id=' + typeid
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
										? AuditGetList()
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

function AuditGetList(length, offset) {
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
					'SELECT p1.name productname,p1.barcode productbarcode,s1.name status FROM scanapp_testing_audit a1 ' +
					'LEFT JOIN scanapp_testing_products p1 on(p1.id=a1.products_id) ' +
					'LEFT JOIN scanapp_testing_statuses s1 on (s1.id=a1.status_id) WHERE a1.dateexpired IS NULL AND a1.userscreated_id=$1 ORDER BY a1.id ' +
					'LIMIT $2 OFFSET $3';
				let params = ['999', !__.isUNB(length) ? length : '10', !__.isUNB(offset) ? offset : '0'];
				client.query(sql, params, (err, result) => {
					done();
					err ? reject('Error get audit list. ') : resolve(result.rows);
				});
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
module.exports.AuditGetList = AuditGetList;
