/* global GitHub */

// Cache for getProjects.
const projectsCache = {};

/**
 * Get a list of all GitHub projects in an organization.
 *
 * @param {GitHub} octokit - Initialized Octokit REST client.
 * @param {string} org     - Repository organization.
 * @returns {Promise<Array>} Promise resolving to an array of all projects for that organization.
 */
async function getProjects( octokit, org ) {
	const projects = [];
	if ( projectsCache[ org ] ) {
		return projectsCache[ org ];
	}

	for await ( const response of octokit.paginate.iterator( octokit.rest.projects.listForOrg, {
		org,
	} ) ) {
		for ( const project of response.data ) {
			projects.push( project );
		}
	}

	projectsCache[ org ] = projects;
	return projects;
}

module.exports = getProjects;
