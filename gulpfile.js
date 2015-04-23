/**
 * Lisa Marie WordPress Theme
 * Project Build Script
 */

/* jshint node: true, globalstrict: true */

'use strict';

var _           = require('lodash');
var Handlebars  = require('handlebars');
var fs          = require('fs');
var os          = require('os');
var path        = require('path');
var glob        = require('glob');
var gulp        = require('gulp');
var $           = require('gulp-load-plugins')({ lazy: true });
var del         = require('del');
var exec        = require('child_process').exec;
var spawnSync   = require('child_process').spawnSync;
var runSequence = require('run-sequence');
var mapStream   = require('map-stream');
var lazypipe    = require('lazypipe');
var pngcrush    = require('imagemin-pngcrush');
var notifier    = require('node-notifier');
var browserSync = require('browser-sync');
var reload      = browserSync.reload;

// Runtime Configuration
var root       = __dirname;
var production = !$.util.env.dev;
var vagrantDir = path.join(root, '.vagrant', 'machines', 'default', 'virtualbox');
var config     = {

  root: root,

  source: path.join(root, 'source'),

  build: path.join(root, 'build'),

  vagrantKey: path.join(vagrantDir, 'private_key'),

  rsync: {
    host: 'fifthroomcreative.com',
    port: 31173,
    user: 'frcweb',
    path: '/home/frcweb/public_html/rda.fifthroomhosting.com/public/static/',
  },

  sass: {
    errLogToConsole: true,
    outputStyle: 'expanded',
    sourceComments: !production,
    precision: 10,
    includePaths: [
      path.join(root, 'source', 'css'),
      path.join(root, 'node_modules')
    ]
  },

  pleeease: {
    browsers: [ 'last 3 versions', 'ios >= 6' ],
    minifier: production ? { preserveHacks: true, removeAllComments: true } : false,
    sourcemaps: false,
    mqpacker: production
  }

};

var staticFiles = [
  'source/**/*',
  '!source/**/*.scss',
  '!source/**/*.html'
];

// Helper Functions
var vagrantRunning = function() {
  var machineID, result;
  var idFile = path.join(vagrantDir, 'id');

  if (!fs.existsSync(idFile)) return false;

  machineID = fs.readFileSync(idFile).toString();
  result    = spawnSync('vboxmanage', [ 'list', 'runningvms' ]).stdout.toString();

  return result.indexOf(machineID) !== -1;
};

var startVagrant = function() {
  var vagrantCmd = spawnSync('vagrant', [ 'up' ]);
  return vagrantCmd.status === 0;
}

var isOSX = function() {
  return os.platform() === 'darwin';
};

var log = function(msg, once) {
  if (once == null) {
    once = true;
  }

  var times = 0;

  return mapStream(function(file, cb) {
    if (!once || (once && times < 1)) {
      $.util.log(msg);
    }

    times++;
    cb(null, file);
  });
};

var vagrantCommand = function(command, shellOpts) {
  if (_.isUndefined(command)) {
    command = '';
  }

  if (!_.isObject(shellOpts)) {
    shellOpts = {};
  }

  if (_.isArray(command)) {
    command = command.join(' ');
  }

  var bindings = { dev: secrets.servers.dev };
  command = _.template(command)(bindings);
  var sshCmd = 'vagrant ssh --command \'<%= cmd %>\'';

  return $.shell(sshCmd, {
    templateData: {
      cmd: command
    }
  });
};

// Reusable Gulp Pipelines
var pipelines = {
  compressedCopy: function(output) {
    return lazypipe()
      .pipe(gulp.dest, output)
      .pipe(function() {
        return $.if(production, $.zopfli());
      })
      .pipe(function() {
        return $.if(production, gulp.dest(output));
      });
  }
}

// Begin Task Definitions
gulp.task('clean', del.bind(null, [ '.tmp', 'build' ]));

gulp.task('print-config', function(cb) {
  console.log(config);
  cb();
});

gulp.task('serve-html', function(cb) {
  if (!vagrantRunning()) {
    startVagrant();
  }

  browserSync({
    logPrefix: 'Lisa Marie',
    watchOptions: {
      debounceDelay: 1000
    },
    server: {
      baseDir: config.build
    },
    tunnel: !!$.util.env.tunnel
  });

  $.watch('source/css/**/*.scss', function() {
    runSequence('styles');
  });

  $.watch('source/**/*.html', function() {
    runSequence('html', reload);
  })

  $.watch(staticFiles, function() {
    runSequence('copy', reload);
  });
});

gulp.task('styles', function(cb) {
  runSequence( 'styles:scss', cb );
});

gulp.task('styles:scss', function() {
  var compress = pipelines.compressedCopy('build/css');

  return gulp.src('source/css/**/*.scss')
    .pipe($.sass(config.sass))
    .pipe($.pleeease(config.pleeease))
    .pipe(compress())
    .pipe($.size({ title: 'scss' }))
    .pipe(reload({ stream: true }));
});

gulp.task('html', function() {
  var includeHandler = function(filePath) {
    var fullPath = path.join(config.source, filePath);

    if (!fs.existsSync(fullPath)) {
      return '';
    }

    return fs.readFileSync(fullPath).toString();
  };

  return gulp.src('source/**/*.html')
    .pipe($.template({
      include: includeHandler
    }))
    .pipe(gulp.dest('build'));
});

gulp.task('copy', function() {
  return gulp.src(staticFiles)
    .pipe($.size({ title: 'static files' }))
    .pipe(gulp.dest('build'));
});

gulp.task('sync:up', function() {
  return gulp.src('', { read: false })
  .pipe($.shell(
    'rsync -e "ssh -p <%= port %>" -avzr --delete build/ <%= user %>@<%= host %>:<%= path %>',
    {
      templateData: config.rsync
    }
  ));
});

gulp.task('default', function(cb) {
  runSequence(
    'clean',
    'copy',
    'html',
    'styles',
    cb
  );
});
