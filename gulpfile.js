"use strict";

const { src, dest } = require("gulp");
const gulp = require("gulp");
const notify = require("gulp-notify");
const browserSync = require("browser-sync").create();
const sass = require("gulp-sass")(require("sass"));
const del = require("del");
const autoprefixer = require("gulp-autoprefixer");
const cssbeautify = require("gulp-cssbeautify");
const cssnano = require("gulp-cssnano");
const imagemin = require("gulp-imagemin");
const plumber = require("gulp-plumber");
const rename = require("gulp-rename");
const rigger = require("gulp-rigger");
const removeComments = require("gulp-strip-css-comments");
const uglify = require("gulp-uglify");
const panini = require("panini");

// Paths
const srcPath = "src/";
const distPath = "dist/";

const path = {
  build: {
    html: distPath,
    css: distPath + "assets/css/",
    js: distPath + "assets/js/",
    images: distPath + "assets/images/",
    fonts: distPath + "assets/fonts/",
  },
  src: {
    html: srcPath + "*.html",
    css: srcPath + "assets/scss/*.scss",
    js: srcPath + "assets/js/*.js",
    images:
      srcPath +
      "assets/images/**/*.{jpg,png,svg,gif,ico,webp,webmanifest,xml,json}",
    fonts: srcPath + "assets/fonts/**/*.{eot,woff,woff2,ttf,svg}",
  },
  watch: {
    html: srcPath + "**/*.html",
    css: srcPath + "assets/scss/**/*.scss",
    js: srcPath + "assets/js/**/*.js",
    images:
      srcPath +
      "assets/images/**/*.{jpg,png,svg,gif,ico,webp,webmanifest,xml,json}",
    fonts: srcPath + "assets/fonts/**/*.{eot,woff,woff2,ttf,svg}",
  },
  clean: "./" + distPath,
};

function serve() {
  browserSync.init({
    server: {
      baseDir: "./" + distPath,
    },
  });
}

function html() {
  panini.refresh();
  return src(path.src.html, { base: srcPath }) // читаем оригинальный файл
    .pipe(plumber()) // предотвращает ошибки
    .pipe(
      panini({
        // настройки шаблонизатора
        root: srcPath,
        layouts: srcPath + "templates/layouts/",
        partials: srcPath + "templates/partials/",
        data: srcPath + "templates/data/",
      })
    )
    .pipe(dest(path.build.html)) // записываем build файл
    .pipe(browserSync.reload({ stream: true })); // перезагрузим сайт и работаем дальше
}
function css() {
  return src(path.src.css, { base: srcPath + "assets/scss/" })
    .pipe(
      plumber({
        // предотвращает ошибки при написаниии кода
        errorHandler: function (err) {
          // обрабатываем ошибки
          notify.onError({
            title: "SCSS Error",
            message: "Error: <%= error.message %>",
          })(err);
          this.emit("end");
        },
      })
    )
    .pipe(sass()) // компилируем scss в css
    .pipe(autoprefixer()) // расставляем префиксы
    .pipe(cssbeautify())
    .pipe(dest(path.build.css)) // билдим читаемый css, далее создаем min.css
    .pipe(
      cssnano({
        zindex: false, // zindex не будет изменятся
        discardComments: {
          removeAll: true,
        },
      })
    ) // минифицируем css
    .pipe(removeComments()) // удаляем комменты
    .pipe(
      rename({
        suffix: ".min",
        extname: ".css",
      })
    ) // переименуем файлы
    .pipe(dest(path.build.css)) // записываем build файл
    .pipe(browserSync.reload({ stream: true }));
}
function js() {
  return src(path.src.js, { base: srcPath + "assets/js/" }) // читаем js файл
    .pipe(
      plumber({
        // предотвращает ошибки при написаниии кода
        errorHandler: function (err) {
          // обрабатываем ошибки
          notify.onError({
            title: "JS Error",
            message: "Error: <%= error.message %>",
          })(err);
          this.emit("end");
        },
      })
    )
    .pipe(rigger()) // собираем все js файлы в один
    .pipe(dest(path.build.js)) // записаем файл, далее создаем min.js
    .pipe(uglify()) // минифицируем js файл
    .pipe(
      rename({
        // переименовываем
        suffix: ".min",
        extname: ".js",
      })
    )
    .pipe(dest(path.build.js)) // записываем файл min.js
    .pipe(browserSync.reload({ stream: true }));
}

function images() {
  return src(path.src.images, { base: srcPath + "assets/images/" })
    .pipe(
      imagemin([
        // сжимаем картинки
        // можем регулировать качество как на угодно
        imagemin.gifsicle({ interlaced: true }),
        imagemin.mozjpeg({ quality: 80, progressive: true }),
        imagemin.optipng({ optimizationLevel: 5 }),
        imagemin.svgo({
          plugins: [{ removeViewBox: true }, { cleanupIDs: false }],
        }),
      ])
    )
    .pipe(dest(path.build.images))
    .pipe(browserSync.reload({ stream: true }));
}

function fonts() {
  return src(path.src.fonts, { base: srcPath + "assets/fonts/" })
    .pipe(dest(path.build.fonts))
    .pipe(browserSync.reload({ stream: true }));
}

function clean() {
  // функция очистки  dist файлов
  return del(path.clean);
}

function watchFiles() {
  // указываем путь слежения, затем функцию выполнения
  gulp.watch([path.watch.html], html);
  gulp.watch([path.watch.css], css);
  gulp.watch([path.watch.js], js);
  gulp.watch([path.watch.images], images);
  gulp.watch([path.watch.fonts], fonts);
}

// build сначала выполнит clean, затем параллельно запустит все таски
const build = gulp.series(clean, gulp.parallel(html, css, js, images, fonts));

// watch параллельно запускает build и watchFiles и serve
const watch = gulp.parallel(build, watchFiles, serve);

exports.html = html;
exports.css = css;
exports.js = js;
exports.images = images;
exports.fonts = fonts;
exports.clean = clean;
exports.build = build;
exports.watch = watch;
exports.default = watch;
