const debug = require( '../../debug' );
const getLabels = require( '../../get-labels' );
const getProjects = require( '../../get-projects' );

/* global GitHub, WebhookPayloadIssue */

/**
 * Check for block-related label on an issue.
 *
 * @param {GitHub} octokit - Initialized Octokit REST client.
 * @param {string} owner   - Repository owner.
 * @param {string} repo    - Repository name.
 * @param {string} number  - Issue number.
 * @returns {Promise<boolean>} Promise resolving to boolean.
 */
async function hasBlockLabel( octokit, owner, repo, number ) {
	const labels = await getLabels( octokit, owner, repo, number );

	// We're only interested in the labels related to blocks (or "extensions").
	const blockLabelIndicators = [ '[Block]', '[Extension]', 'Gutenberg' ];

	const hasLabel = labels.filter( label =>
		blockLabelIndicators.some( indicator => label.includes( indicator ) )
	);

	if ( ! hasLabel.length ) {
		debug( 'add-issue-to-board: This issue does not have block labels.' );
		return false;
	}

	return true;
}

/**
 * Add an issue to a specific GitHub project board if necessary.
 *
 * @param {WebhookPayloadIssue} payload - Issue event payload.
 * @param {GitHub}              octokit - Initialized Octokit REST client.
 */
async function addIssueToBoard( payload, octokit ) {
	const { issue, repository } = payload;
	const { number } = issue;
	const { owner, name } = repository;
	const ownerLogin = owner.login;

	// Get all projects in that organization.
	const projects = await getProjects( octokit, ownerLogin );
	if ( ! projects.length ) {
		debug( `add-issue-to-board: No projects found for ${ ownerLogin }. Aborting.	` );
		return;
	}

	// Check if the issue has a block-related label.
	const touchesBlocks = await hasBlockLabel( octokit, ownerLogin, name, number );

	// Get the ID of the board we currently use for block-related issues.
	const blockProjects = projects.filter(
		project => 'Dotcom Bug Prioritization Board' === project.name
	);

	if ( true === touchesBlocks && blockProjects.length ) {
		const blockProjectId = blockProjects[ 0 ].id;
		debug(
			`add-issue-to-board: Block-related issue. Adding #${ number } to board #${ blockProjectId }`
		);

		await octokit.rest.projects.createCard( {
			column_id: blockProjectId,
			note: 'a note',
			content_id: number,
			content_type: 'issue',
		} );
	}
}

module.exports = addIssueToBoard;
