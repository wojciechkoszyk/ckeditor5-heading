/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* globals console, document, window */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import Enter from '@ckeditor/ckeditor5-enter/src/enter';
import Typing from '@ckeditor/ckeditor5-typing/src/typing';
import Title from '../../src/title';
import Heading from '../../src/heading';
import Undo from '@ckeditor/ckeditor5-undo/src/undo';
import Clipboard from '@ckeditor/ckeditor5-clipboard/src/clipboard';
import { UploadAdapterMock } from '@ckeditor/ckeditor5-upload/tests/_utils/mocks';
import Image from '@ckeditor/ckeditor5-image/src/image';
import ImageUpload from '@ckeditor/ckeditor5-image/src/imageupload';

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [ Enter, Typing, Undo, Heading, Title, Clipboard, Image, ImageUpload ],
		toolbar: [ 'heading', '|', 'undo', 'redo', 'imageUpload' ]
	} )
	.then( editor => {
		window.editor = editor;

		editor.plugins.get( 'FileRepository' ).createUploadAdapter = loader => new UploadAdapterMock( loader );
	} )
	.catch( err => {
		console.error( err.stack );
	} );
