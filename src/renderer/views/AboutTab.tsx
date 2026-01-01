export const AboutTab = () => (
	<div className="panel-container">
		<div className="panel">
			<div className="flex items-center gap-4 mb-4">
				<img src="/icon.svg" alt="Jpeglic" className="h-12 w-12" />
				<div>
					<h2 className="text-2xl font-semibold text-[color:var(--color-primary)]">
						Jpeglic • Best jpg converter
					</h2>
					<p className="panel-text">Version 1.0.0</p>
				</div>
			</div>
			<p className="panel-text mb-8">Easy-to-use image converter for modern formats.</p>

			<h3 className="panel-title">Features</h3>
			<ul className="mt-3 list-disc space-y-2 pl-5 panel-text">
				<li>Support for JPEG XL, AVIF, JPEG, PNG formats</li>
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

				<li>jpegli (JPEG)</li>
				<li>ImageMagick (downscaling and PNG)</li>
				<li>ExifTool (metadata)</li>
			</ul>
		</div>
	</div>
);
