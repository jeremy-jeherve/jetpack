<?php

namespace Automattic\Jetpack_Boost\Lib;

use Automattic\Jetpack_Boost\Features\Optimizations\Cloud_CSS\Cloud_CSS;
use Automattic\Jetpack_Boost\Features\Optimizations\Critical_CSS\Critical_CSS;

class Status {

	/**
	 * Slug of the optimization module which is currently being toggled
	 *
	 * @var string $slug
	 */
	protected $slug;

	/**
	 *
	 *
	 * @var array[] $status_sync_map
	 */
	protected $status_sync_map;

	public function __construct( $slug ) {
		$this->slug = $slug;

		$this->status_sync_map = array(
			Cloud_CSS::get_slug() => array(
				Critical_CSS::get_slug(),
			),
		);
	}

	public function is_enabled() {
		return '1' === get_option( $this->get_status_slug( $this->slug ) );
	}

	public function update( $new_status ) {

		if ( update_option( $this->get_status_slug( $this->slug ), (bool) $new_status ) ) {
			$this->update_mapped_modules( $new_status );
			// Only record analytics event if the config update succeeds.
			$this->track_module_status( (bool) $new_status );
			return true;
		}
		return false;
	}

	protected function get_status_slug( $module_slug ) {
		return 'jetpack_boost_status_' . $module_slug;
	}

	protected function update_mapped_modules( $new_status ) {
		if ( ! isset( $this->status_sync_map[ $this->slug ] ) ) {
			return;
		}

		foreach ( $this->status_sync_map[ $this->slug ] as $mapped_module ) {
			update_option( $this->get_status_slug( $mapped_module ), (bool) $new_status );
		}
	}

	protected function track_module_status( $status ) {
		Analytics::record_user_event(
			'set_module_status',
			array(
				'module' => $this->slug,
				'status' => $status,
			)
		);
	}

}
