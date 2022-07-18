import { src, dest, watch, series, parallel } from 'gulp';
import yargs from 'yargs';
import sass from 'gulp-sass';
import cleanCss from 'gulp-clean-css';
import gulpif from 'gulp-if';
import postcss from 'gulp-postcss';
import sourcemaps from 'gulp-sourcemaps';
import autoprefixer from 'autoprefixer';
import del from 'del';
import webpack from 'webpack-stream';
import browserSync from "browser-sync";

const PRODUCTION = yargs.argv.prod;

export const compileStyles = () => {
  	return src('src/scss/bundle.scss')
    .pipe(gulpif(!PRODUCTION, sourcemaps.init()))
    // compile from sass to css
    .pipe(sass().on('error', sass.logError))
    // add vendor profixes
    .pipe(gulpif(PRODUCTION, postcss([ autoprefixer ])))
    // minify the file
    .pipe(gulpif(PRODUCTION, cleanCss({compatibility:'ie8'})))
    // add source maps
    .pipe(gulpif(!PRODUCTION, sourcemaps.write()))
	// pipe to the destination folder
    .pipe(dest('dist/css'));
}

export const copyFiles = () =>{
  return src([
		'src/**/*', 
		'!src/{js,scss}', 
		'!src/{js,scss}/**/*',
	])
	.pipe(dest('dist'));
}

export const deleteDist = () => del(['dist']);

export const compileScripts = () => {
	return src('src/js/bundle.js')
	.pipe(webpack({
		module: {
			rules: [
				{
				test: /\.js$/,
				use: {
					loader: 'babel-loader',
					options: {
					presets: []
					}
				}
				}
			]
			},
			mode: PRODUCTION ? 'production' : 'development',
			devtool: !PRODUCTION ? 'inline-source-map' : false,
			output: {
			// we need to specify a file name, otherwise webpack will generate
			// a bundle with a hash as the filename
			filename: 'bundle.js'
		},
	}))
	.pipe(dest('dist/js'));
}

// Refreshing the browser with Browsersync
const server = browserSync.create();
export const serve = done => {
	server.init({
		// put your local website link here:
		proxy: "http://localhost:8888/wordpress-play2-npm/" 
	});
	done();
};
export const reload = done => {
	server.reload();
	done();
};

export const watchForChanges = () => {
	watch('src/scss/**/*.scss', series(compileStyles, reload));
	watch('src/js/**/*.js', series(compileScripts, reload));
	watch(['src/**/*','!src/{scss,js,}','!src/{scss,js}/**/*'], series(copyFiles, reload));
	watch('**/*.php', reload); 
	watch('**/*.html', reload); 
}

export const dev = series(deleteDist, parallel(compileStyles, compileScripts, copyFiles), serve, watchForChanges);
export const build = series(deleteDist, parallel(compileStyles, compileScripts, copyFiles));
export default dev;
