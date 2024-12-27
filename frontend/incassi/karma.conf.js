// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: 'src',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('@angular-devkit/build-angular/plugins/karma'),
      require('karma-chrome-launcher'),
      require('karma-coverage'),
      require('karma-firefox-launcher'),
      require('karma-jasmine'),
      require('karma-jasmine-html-reporter'),
      require('karma-junit-reporter'),
      require('karma-spec-reporter'),
    ],
    client: {
      jasmine: {
        // You can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with `random: false`
        // or set a specific seed with `seed: 4321`
        random: false,
      },
      clearContext: false, // Leave Jasmine Spec Runner output visible in browser
    },
    customLaunchers: {
      HeadlessFirefox: {
        base: 'Firefox',
        flags: ['-headless'],
      },
    },
    jasmineHtmlReporter: {
      suppressAll: true, // Removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/incassi'),
      subdir: '.',
      reporters: [
        {type: 'html'},
        {type: 'text-summary'},
        {type: 'cobertura', file: 'coverage.xml'},
      ],
    },
    junitReporter: {
      outputDir: '../', // results will be saved as $outputDir/$browserName.xml
      outputFile: 'report.xml', // if included, results will be saved as $outputDir/$browserName/$outputFile
      suite: '', // suite will become the package name attribute in xml testsuite element
      useBrowserName: false, // add browser name to report and classes names
      nameFormatter: undefined, // function (browser, result) to customize the name attribute in xml testcase element
      classNameFormatter: undefined, // function (browser, result) to customize the classname attribute in xml testcase element
      properties: {}, // key value pair of properties to add to the <properties> section of the report
      xmlVersion: null, // use '1' if reporting to be per SonarQube 6.2 XML format
    },
    reporters: ['progress', 'kjhtml', 'coverage', 'junit'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['HeadlessFirefox'],
    singleRun: true,
    restartOnFileChange: true,
  });
};
