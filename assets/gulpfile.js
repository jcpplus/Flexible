var gulp = require('gulp');
var sass = require('gulp-sass');
var filter = require('gulp-filter');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var gutil = require('gulp-util');
var sourcemaps = require('gulp-sourcemaps');
var prefix = require('gulp-autoprefixer');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var pngquant = require('imagemin-pngquant');
var del = require('del');
var crypto = require('crypto');
var through = require('through2');
var Path = require('path');
var fs = require('fs');

var cwd = __dirname;
var URL_PREFIX = '\/assets';
var HASH_EXCLUDES = [/lazyload.jpg$/];
var urlMap = {};
var urlMapFile = Path.join(cwd, 'file_map.json');

var outputDir = '.';

var isDevEnv = !gutil.env.type || gutil.env.type.toLowerCase() === 'dev';
var cssJsRegExp = /\.(css|js)$/;

if (!isDevEnv) {
    outputDir = 'dist';
}

var md5 = crypto.createHash('md5');

function calcMd5(file) {
    var md5 = crypto.createHash('md5');
    md5.update(file.contents.toString(), 'utf8');
    return md5.digest('hex');
}

function parsePath(path) {
    var extname = Path.extname(path);
    return {
        dirname: Path.dirname(path),
        basename: Path.basename(path, extname),
        extname: extname
    };
}

function renameWithMD5(file) {
    if (!file.contents) {
        return;
    }
    var excludeLength = HASH_EXCLUDES.length;
    var shouldIgnore = false;
    var i = 0;
    for (i = 0; i < excludeLength; i++) {
        var excludeRegx = HASH_EXCLUDES[i];
        if (excludeRegx.test(file.relative)) {
            shouldIgnore = true;
            break;
        }
    }
    if (shouldIgnore) {
        return;
    }
    var parsedPath = parsePath(file.relative);
    var orginBasename = parsedPath.basename;
    var basename = orginBasename + '_' + calcMd5(file);
    var base = file.base.substring(cwd.length);

    var pathKey = Path.join(base, Path.join(parsedPath.dirname, orginBasename + parsedPath.extname));
    var pathValue = Path.join(base, Path.join(parsedPath.dirname, basename + parsedPath.extname));

    file.path = Path.join(file.base, Path.join(parsedPath.dirname, basename + parsedPath.extname));

    pathKey = URL_PREFIX + pathKey.replace(/\\/g, '\/').replace('\/scss\/', '\/css\/');
    pathValue = URL_PREFIX + pathValue.replace(/\\/g, '\/').replace('\/scss\/', '\/css\/');
    urlMap[pathKey] = pathValue;
}

gulp.task('clean', function(cb) {
    del.sync('dist');
    del.sync(urlMapFile);
    cb();
});

gulp.task('build:js', function() {
    var stream = gulp.src(['js/**/*.js']);
    if (!isDevEnv) {
        stream = stream.pipe(uglify())
            .pipe(through.obj(function(file, enc, cb) {
                renameWithMD5(file);
                this.push(file);
                cb();
            }));
    }
    return stream.pipe(gulp.dest(outputDir + '/js'));
});

gulp.task('build:audio', function() {
    var stream = gulp.src(['audio/**/*.*']);
    if (!isDevEnv) {
        stream = stream.pipe(through.obj(function(file, enc, cb) {
            renameWithMD5(file);
            this.push(file);
            cb();
        }));
    }
    return stream.pipe(gulp.dest(outputDir + '/audio'));
});

gulp.task('build:img', function(cb) {
    if (!isDevEnv) {
        return gulp.src('img/**')
            .pipe(imagemin({
                progressive: true,
                use: [pngquant()]
            }))
            .pipe(through.obj(function(file, enc, cb) {
                renameWithMD5(file);
                this.push(file);
                cb();
            }))
            .pipe(gulp.dest('dist/img'));
    } else {
        cb();
    }
});

/**
 * [sass files config]
 * @type {String}
 * @outputStyle : nested expanded compact compressed
 */

gulp.task('sass', ['build:img'], function() {

    var input = './scss/**/*.scss';
    var sassOptions = {
        errLogToConsole: true,
        outputStyle: 'expanded'
    };

    // isDevEnv = true
    if (!isDevEnv) {
        console.log("isDevEnv " + isDevEnv);
        return gulp
            .src(input)
            .pipe(sourcemaps.init())
            .pipe(sass({
                outputStyle: 'expanded'
            }).on('error', sass.logError))
            .pipe(prefix("last 2 version", "> 1%", "ie 9"))
            .pipe(sourcemaps.write('./maps'))
            .pipe(gulp.dest(outputDir + '/dist'));
    } else {
        return gulp
            .src(input)
            .pipe(sourcemaps.init())
            .pipe(sass(sassOptions).on('error', sass.logError))
            .pipe(prefix("last 2 version", "> 1%", "ie 9"))
            .pipe(sourcemaps.write('./maps'))
            .pipe(gulp.dest(outputDir + '/css'))
            .pipe(filter('**/*.css'))
            .pipe(reload({
                stream: true
            }));
    }
});


//
gulp.task('html', function() {
        return gulp
            .src('../*.html')
            .pipe(reload({
                stream: true
            }))
    })
    // browsersync工具 start
    // http://www.browsersync.cn/docs/gulp/
    // Static server
gulp.task('browser-sync', function() {
    var src = {
        scss: 'scss/**/*.scss',
        html: '../*.html',
        js: './gulpfile.js'
    };
    browserSync.init({
        server: {
            baseDir: "../"
        }
    });

    gulp.watch(src.scss, ['sass'])
        .on('change', function(event) {
            console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
        });
    gulp.watch(src.html, ['html'])
        .on('change', function(event) {
            console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
        });
    gulp.watch(src.js, ['build:js'], reload)
        .on('change', function(event) {
            console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
        });
});
gulp.task('bs', ['browser-sync']); //定义默认任务

// browsersync工具 end
//
gulp.task('sass-pro', function() {

    var input = './scss/**/*.scss';
    return gulp
        .src(input)
        .pipe(sass({
            outputStyle: 'compressed'
        }).on('error', sass.logError))
        .pipe(prefix("last 2 version", "> 1%", "ie 9"))
        .pipe(gulp.dest(outputDir + '/css'));
});

// gulp.task('sass', ['build:img'], function() {
//   var sassConf = {
//     style: 'expanded',
//     sourcemap: true
//   };

//   var stream;

//   if (!isDevEnv) {
//     // 生产环境css压缩且不输出sourcemap
//     sassConf.style = 'compressed';
//     sassConf.sourcemap = false;
//     stream = sass('scss', sassConf)
//       .pipe(through.obj(function(file, enc, cb) {
//         if (file.contents) {
//           var contents = file.contents.toString();
//           for (var key in urlMap) {
//             if (urlMap.hasOwnProperty(key) && !cssJsRegExp.test(key)) {
//               var oriPath = key.replace(URL_PREFIX + '/', '/');
//               var hashedPath = urlMap[key].replace(URL_PREFIX + '\/', '/');
//               contents = contents.replace(new RegExp(oriPath, 'g'), hashedPath);
//             }
//           }
//           file.contents = new Buffer(contents);
//         }
//         this.push(file);
//         cb();
//       }))
//       .pipe(through.obj(function(file, enc, cb) {
//         renameWithMD5(file);
//         this.push(file);
//         cb();
//       }));
//   } else {
//     stream = sass('./scss/scratch.scss', sassConf).pipe(sourcemaps.write());
//   }
//   return stream.pipe(gulp.dest(outputDir + '/css'));
// });
gulp.task('sass:watch', function() {
    // watch for sass files
    return gulp
        .watch('scss/**/*.scss', ['sass'])
        .on('change', function(event) {
            console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
        });
});

gulp.task('watch', function() {
    // watch for sass files
    return gulp
        .watch('scss/**/*.scss', ['sass'])
        .on('change', function(event) {
            console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
        });

    // watch for javascript files
    gulp.watch('js/**/*.js', ['build.js']);

    // watch for images files
    gulp.watch('img/**', ['build.img']);

});

gulp.task('default', function() {
    console.log('-----------------------------------------\n',
        'using --type {env} to pass the env configuration\n',
        'Tasks:\n\n',
        'js\t', 'Lint the javascript then concat them to the dist/js folder.\n',
        'sass\t', 'Complie the sass file to dist/css file.\n',
        'build\t', 'Run js , sass taks\n',
        '-----------------------------------------\n');
});

gulp.task('build', ['clean', 'sass', 'build:js', 'build:audio'], function() {
    fs.writeFile(urlMapFile, JSON.stringify(urlMap, null, '\t'), function(err) {
        if (err) {
            console.log(err);
        } else {
            console.log("JSON saved to " + urlMapFile);
        }
    });
});
