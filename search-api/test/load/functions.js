/**
 * Artillery Custom Functions
 * Provides dynamic data for load tests
 */

module.exports = {
  /**
   * Generate random search query from predefined set
   */
  randomSearchQuery: function(context, events, done) {
    const queries = [
      'AI tools for coding',
      'machine learning platforms',
      'chatgpt alternatives',
      'data analysis tools',
      'project management software',
      'code review tools',
      'API testing tools',
      'CI/CD platforms',
      'cloud infrastructure',
      'database management systems',
      'AI image generators',
      'video editing software',
      'design tools',
      'collaboration platforms',
      'automation tools',
      'monitoring solutions',
      'security tools',
      'DevOps platforms',
      'no-code platforms',
      'analytics tools'
    ];

    context.vars.randomSearchQuery = queries[Math.floor(Math.random() * queries.length)];
    return done();
  },

  /**
   * Generate random limit (1-20)
   */
  randomLimit: function(context, events, done) {
    context.vars.randomLimit = Math.floor(Math.random() * 20) + 1;
    return done();
  }
};
