export const AboutTab = () => (
	<div className="panel-container">
		<div className="panel">
			<h2 className="text-2xl font-semibold text-[color:var(--color-primary)] mb-2">XL Converter</h2>
			<p className="panel-text mb-4">Version 1.0.0</p>
			<p className="panel-text mb-8">Easy-to-use image converter for modern formats.</p>

			<h3 className="panel-title">Features</h3>
			<ul className="mt-3 list-disc space-y-2 pl-5 panel-text">
				<li>Support for JPEG XL, AVIF, WebP, JPEG, PNG formats</li>
				<li>Parallel encoding for faster processing</li>
				<li>Lossless JPEG transcoding</li>
				<li>Flexible downscaling options</li>
				<li>Metadata and timestamp preservation</li>
			</ul>

			<h3 className="panel-title mt-8">External Tools</h3>
			<p className="mt-2 panel-text">This application uses the following external encoders:</p>
			<ul className="mt-3 list-disc space-y-2 pl-5 panel-text">
				<li>libjxl (JPEG XL)</li>
				<li>avifenc (AVIF)</li>
				<li>cwebp (WebP)</li>
				<li>jpegli (JPEG)</li>
				<li>ImageMagick (downscaling and PNG)</li>
				<li>ExifTool (metadata)</li>
			</ul>
		</div>
	</div>
);
