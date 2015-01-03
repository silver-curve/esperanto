import hasOwnProp from 'utils/hasOwnProp';
import traverseAst from 'utils/ast/traverse';

export default function transformBody ( bundle, mod, body ) {
	var identifierReplacements,
		exportNames,
		alreadyExported = {},
		shouldExportEarly = {},
		exportBlock;

	identifierReplacements = bundle.identifierReplacements[ mod.id ];

	exportNames = hasOwnProp.call( bundle.exports, mod.id ) && bundle.exports[ mod.id ];

	traverseAst( mod.ast, body, identifierReplacements, exportNames, alreadyExported );

	// remove imports
	mod.imports.forEach( x => {
		if ( !x.passthrough ) {
			body.remove( x.start, x.next );
		}
	});

	// Remove export statements (but keep declarations)
	mod.exports.forEach( x => {
		var name;

		if ( x.default ) {
			if ( x.type === 'namedFunction' || x.type === 'namedClass' ) {
				// if you have a default export like
				//
				//     export default function foo () {...}
				//
				// you need to rewrite it as
				//
				//     function foo () {...}
				//     exports.default = foo;
				//
				// as the `foo` reference may be used elsewhere

				// remove the `export default `, keep the rest
				body.remove( x.start, x.valueStart );
			}

			else if ( x.node.declaration && ( name = x.node.declaration.name ) ) {
				if ( name === identifierReplacements.default.name ) {
					body.remove( x.start, x.end );
				} else {
					body.replace( x.start, x.end, `var ${identifierReplacements.default.name} = ${identifierReplacements[name].name};` );
				}
			}

			else {
				body.replace( x.start, x.valueStart, `var ${identifierReplacements.default.name} = ` );
			}

			return;
		}

		if ( x.declaration ) {
			if ( x.type === 'namedFunction' ) {
				shouldExportEarly[ x.name ] = true; // TODO what about `function foo () {}; export { foo }`?
			}

			body.remove( x.start, x.valueStart );
		} else {
			body.remove( x.start, x.next );
		}
	});

	if ( mod._exportsNamespace ) {
		let prefix = bundle.uniqueNames[ mod.id ],
			namespaceExportBlock = `var ${prefix} = {\n`,
			namespaceExports = [];

		mod.exports.forEach( x => {
			if ( x.declaration ) {
				namespaceExports.push( body.indentStr + `get ${x.name} () { return ${identifierReplacements[x.name].name}; }` );
			}

			else if ( x.default ) {
				namespaceExports.push( body.indentStr + `get default () { return ${identifierReplacements.default.name}; }` );
			}

			else {
				x.specifiers.forEach( s => {
					namespaceExports.push( body.indentStr + `get ${s.name} () { return ${s.name}; }` );
				});
			}
		});

		namespaceExportBlock += namespaceExports.join( ',\n' ) + '\n};\n\n';

		body.prepend( namespaceExportBlock );
	}

	if ( exportNames ) {
		exportBlock = [];

		Object.keys( exportNames ).forEach( name => {
			var exportAs;

			if ( !alreadyExported[ name ] ) {
				exportAs = exportNames[ name ];

				exportBlock.push( `exports.${exportAs} = ${identifierReplacements[name].name};` );
			}
		});

		if ( exportBlock.length ) {
			body.trim().append( '\n\n' + exportBlock.join( '\n' ) );
		}
	}

	return body.trim();
}
