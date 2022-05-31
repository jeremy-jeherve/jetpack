/**
 * External Dependencies
 */
import filesize from 'filesize';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { escapeHTML } from '@wordpress/escape-html';
import { getJWT, resumableUploader } from './use-uploader';
import { Button } from '@wordpress/components';
import {
	createInterpolateElement,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from '@wordpress/element';

/**
 * Internal Dependencies
 */
import { VideoPressBlockContext } from '../components';
import './style.scss';

export default function ResumableUpload( { file } ) {
	const [ progress, setProgress ] = useState( 0 );
	const [ hasPaused, setHasPaused ] = useState( false );
	const [ tusUploader, setTusUploader ] = useState( null );
	const [ error, setError ] = useState( null );
	const [ currentUploadKey, setCurrentUploadKey ] = useState( null );
	const { onUploadFinished } = useContext( VideoPressBlockContext );
	const tusUploaderRef = useRef( null );

	tusUploaderRef.current = tusUploader;

	const startUpload = useCallback( () => {
		const onError = uploadError => {
			setError( uploadError );
		};

		const onProgress = ( bytesUploaded, bytesTotal ) => {
			const percentage = ( bytesUploaded / bytesTotal ) * 100;
			setProgress( percentage );
		};

		const onSuccess = args => {
			onUploadFinished( args );
		};

		const onUploadUuidRetrieved = key => {
			if ( null === currentUploadKey ) {
				setCurrentUploadKey( key );
			}
		};

		const uploader = resumableUploader( {
			onError,
			onProgress,
			onSuccess,
			onUploadUuidRetrieved,
		} );

		getJWT()
			.then( jwtData => {
				const newUploader = uploader( file, jwtData );
				setTusUploader( newUploader );
			} )
			.catch( jwtError => {
				setError( jwtError );
			} );
	}, [ file, onUploadFinished, currentUploadKey ] );

	useEffect( () => {
		// Kicks things off.
		startUpload();

		// Stop the upload when the block is removed.
		return () => {
			if ( null !== tusUploaderRef.current ) {
				tusUploaderRef.current.abort();
			}
		};
		// We need to pass a blank array here to act as 'component mount/unmount'
		// We don't want this effect to run again if `startUpload` changes.
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	const roundedProgress = Math.round( progress );
	const cssWidth = { width: `${ roundedProgress }%` };

	const pauseOrResumeUpload = () => {
		if ( tusUploader ) {
			if ( hasPaused ) {
				tusUploader.start();
			} else {
				tusUploader.abort();
			}
			setHasPaused( ! hasPaused );
		}
	};

	const restartUpload = () => {
		setError( null );
		startUpload();
	};

	const escapedFileName = escapeHTML( file.name );
	const fileNameLabel = createInterpolateElement(
		sprintf(
			/* translators: Placeholder is a video file name. */
			__( 'Uploading <strong>%s</strong>', 'jetpack' ),
			escapedFileName
		),
		{ strong: <strong /> }
	);

	const fileSizeLabel = filesize( file.size );

	return (
		<>
			{ null !== error ? (
				<div className="resumable-upload__error">
					<div className="resumable-upload__error-text">
						{ __(
							'An error was encountered during the upload. Check your network connection.',
							'jetpack'
						) }
					</div>
					<Button variant="primary" onClick={ () => restartUpload() }>
						{ __( 'Try again', 'jetpack' ) }
					</Button>
					<Button
						variant="secondary"
						onClick={ () => onUploadFinished( { mediaId: null } ) }
						className="resumable-upload__error-cancel"
					>
						{ __( 'Cancel', 'jetpack' ) }
					</Button>
				</div>
			) : (
				<div className="resumable-upload__status">
					<div className="resumable-upload__file-info">
						<div className="resumable-upload__file-name">{ fileNameLabel }</div>
						&nbsp;&#8212;&nbsp;
						<div className="resumable-upload__file-size">{ fileSizeLabel }</div>
					</div>
					<div className="resumable-upload__progress">
						<div className="resumable-upload__progress-loaded" style={ cssWidth } />
					</div>
					<div className="resumable-upload__actions">
						<div className="videopress-upload__percent-complete">{ `${ roundedProgress }%` }</div>
						<Button variant="link" onClick={ () => pauseOrResumeUpload() }>
							{ hasPaused ? 'Resume' : 'Pause' }
						</Button>
					</div>
				</div>
			) }
		</>
	);
}
