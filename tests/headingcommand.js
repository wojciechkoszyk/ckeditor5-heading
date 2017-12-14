/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import ModelTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/modeltesteditor';
import ParagraphCommand from '@ckeditor/ckeditor5-paragraph/src/paragraphcommand';
import HeadingCommand from '../src/headingcommand';
import Range from '@ckeditor/ckeditor5-engine/src/model/range';
import { setData, getData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';

const options = [
	{ modelElement: 'heading1', viewElement: 'h2', title: 'H2' },
	{ modelElement: 'heading2', viewElement: 'h3', title: 'H3' },
	{ modelElement: 'heading3', viewElement: 'h4', title: 'H4' }
];

describe( 'HeadingCommand', () => {
	let editor, model, document, commands, root, schema;

	beforeEach( () => {
		return ModelTestEditor.create().then( newEditor => {
			editor = newEditor;
			model = editor.model;
			document = model.document;
			commands = {};
			schema = model.schema;

			editor.commands.add( 'paragraph', new ParagraphCommand( editor ) );
			schema.registerItem( 'paragraph', '$block' );

			for ( const option of options ) {
				commands[ option.modelElement ] = new HeadingCommand( editor, option.modelElement );
				schema.registerItem( option.modelElement, '$block' );
			}

			schema.registerItem( 'notBlock' );
			schema.allow( { name: 'notBlock', inside: '$root' } );
			schema.allow( { name: '$text', inside: 'notBlock' } );

			root = document.getRoot();
		} );
	} );

	afterEach( () => {
		for ( const modelElement in commands ) {
			commands[ modelElement ].destroy();
		}
	} );

	describe( 'modelElement', () => {
		it( 'is set', () => {
			expect( commands.heading1.modelElement ).to.equal( 'heading1' );
		} );
	} );

	describe( 'value', () => {
		for ( const option of options ) {
			test( option );
		}

		function test( { modelElement } ) {
			it( `equals ${ modelElement } when collapsed selection is placed inside ${ modelElement } element`, () => {
				setData( model, `<${ modelElement }>foobar</${ modelElement }>` );
				const element = root.getChild( 0 );
				document.selection.addRange( Range.createFromParentsAndOffsets( element, 3, element, 3 ) );

				expect( commands[ modelElement ].value ).to.be.true;
			} );

			it( 'equals false if inside to non-block element', () => {
				setData( model, '<notBlock>[foo]</notBlock>' );

				expect( commands[ modelElement ].value ).to.be.false;
			} );

			it( `equals false if moved from ${ modelElement } to non-block element`, () => {
				setData( model, `<${ modelElement }>[foo]</${ modelElement }><notBlock>foo</notBlock>` );
				const element = document.getRoot().getChild( 1 );

				model.change( () => {
					document.selection.setRanges( [ Range.createIn( element ) ] );
				} );

				expect( commands[ modelElement ].value ).to.be.false;
			} );

			it( 'should be refreshed after calling refresh()', () => {
				const command = commands[ modelElement ];
				setData( model, `<${ modelElement }>[foo]</${ modelElement }><notBlock>foo</notBlock>` );
				const element = document.getRoot().getChild( 1 );

				// Purposely not putting it in `model.change` to update command manually.
				document.selection.setRanges( [ Range.createIn( element ) ] );

				expect( command.value ).to.be.true;
				command.refresh();
				expect( command.value ).to.be.false;
			} );
		}
	} );

	describe( 'execute()', () => {
		it( 'should update value after execution', () => {
			const command = commands.heading1;

			setData( model, '<paragraph>[]</paragraph>' );
			command.execute();

			expect( getData( model ) ).to.equal( '<heading1>[]</heading1>' );
			expect( command.value ).to.be.true;
		} );

		// https://github.com/ckeditor/ckeditor5-heading/issues/73
		it( 'should not rename blocks which cannot become headings', () => {
			schema.registerItem( 'restricted' );
			schema.allow( { name: 'restricted', inside: '$root' } );
			schema.disallow( { name: 'heading1', inside: 'restricted' } );

			schema.registerItem( 'fooBlock', '$block' );
			schema.allow( { name: 'fooBlock', inside: 'restricted' } );

			setData(
				model,
				'<paragraph>a[bc</paragraph>' +
				'<restricted><fooBlock></fooBlock></restricted>' +
				'<paragraph>de]f</paragraph>'
			);

			commands.heading1.execute();

			expect( getData( model ) ).to.equal(
				'<heading1>a[bc</heading1>' +
				'<restricted><fooBlock></fooBlock></restricted>' +
				'<heading1>de]f</heading1>'
			);
		} );

		it( 'should use parent batch', () => {
			const command = commands.heading1;

			setData( model, '<paragraph>foo[]bar</paragraph>' );

			model.change( writer => {
				expect( writer.batch.deltas.length ).to.equal( 0 );

				command.execute();

				expect( writer.batch.deltas.length ).to.be.above( 0 );
			} );
		} );

		describe( 'collapsed selection', () => {
			let convertTo = options[ options.length - 1 ];

			for ( const option of options ) {
				test( option, convertTo );
				convertTo = option;
			}

			it( 'does nothing when executed with already applied option', () => {
				setData( model, '<heading1>foo[]bar</heading1>' );

				commands.heading1.execute();
				expect( getData( model ) ).to.equal( '<heading1>foo[]bar</heading1>' );
			} );

			it( 'converts topmost blocks', () => {
				schema.registerItem( 'inlineImage', '$inline' );
				schema.allow( { name: '$text', inside: 'inlineImage' } );

				setData( model, '<paragraph><inlineImage>foo[]</inlineImage>bar</paragraph>' );
				commands.heading1.execute();

				expect( getData( model ) ).to.equal( '<heading1><inlineImage>foo[]</inlineImage>bar</heading1>' );
			} );

			function test( from, to ) {
				it( `converts ${ from.modelElement } to ${ to.modelElement } on collapsed selection`, () => {
					setData( model, `<${ from.modelElement }>foo[]bar</${ from.modelElement }>` );
					commands[ to.modelElement ].execute();

					expect( getData( model ) ).to.equal( `<${ to.modelElement }>foo[]bar</${ to.modelElement }>` );
				} );
			}
		} );

		describe( 'non-collapsed selection', () => {
			let convertTo = options[ options.length - 1 ];

			for ( const option of options ) {
				test( option, convertTo );
				convertTo = option;
			}

			it( 'converts all elements where selection is applied', () => {
				setData( model, '<heading1>foo[</heading1><heading2>bar</heading2><heading3>baz]</heading3>' );

				commands.heading3.execute();

				expect( getData( model ) ).to.equal(
					'<heading3>foo[</heading3><heading3>bar</heading3><heading3>baz]</heading3>'
				);
			} );

			it( 'does nothing to the elements with same option (#1)', () => {
				setData( model, '<heading1>[foo</heading1><heading1>bar]</heading1>' );
				commands.heading1.execute();

				expect( getData( model ) ).to.equal(
					'<heading1>[foo</heading1><heading1>bar]</heading1>'
				);
			} );

			it( 'does nothing to the elements with same option (#2)', () => {
				setData( model, '<heading1>[foo</heading1><heading1>bar</heading1><heading2>baz]</heading2>' );
				commands.heading1.execute();

				expect( getData( model ) ).to.equal(
					'<heading1>[foo</heading1><heading1>bar</heading1><heading1>baz]</heading1>'
				);
			} );

			function test( { modelElement: fromElement }, { modelElement: toElement } ) {
				it( `converts ${ fromElement } to ${ toElement } on non-collapsed selection`, () => {
					setData(
						model,
						`<${ fromElement }>foo[bar</${ fromElement }><${ fromElement }>baz]qux</${ fromElement }>`
					);

					commands[ toElement ].execute();

					expect( getData( model ) ).to.equal(
						`<${ toElement }>foo[bar</${ toElement }><${ toElement }>baz]qux</${ toElement }>`
					);
				} );
			}
		} );
	} );

	describe( 'isEnabled', () => {
		for ( const option of options ) {
			test( option.modelElement );
		}

		function test( modelElement ) {
			let command;

			beforeEach( () => {
				command = commands[ modelElement ];
			} );

			describe( `${ modelElement } command`, () => {
				it( 'should be enabled when inside another block', () => {
					setData( model, '<paragraph>f{}oo</paragraph>' );

					expect( command.isEnabled ).to.be.true;
				} );

				it( 'should be disabled if inside non-block', () => {
					setData( model, '<notBlock>f{}oo</notBlock>' );

					expect( command.isEnabled ).to.be.false;
				} );

				it( 'should be disabled if selection is placed on non-block', () => {
					setData( model, '[<notBlock>foo</notBlock>]' );

					expect( command.isEnabled ).to.be.false;
				} );
			} );
		}
	} );
} );
