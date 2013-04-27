var noble = require('./index')
  , util  = require('util')
  ;

var uuidmap = {
// services
                '1800' : { name : 'Generic Access'
                         , type : 'org.bluetooth.service.generic_access'
                         }
              , '1801' : { name : 'Generic Attribute'
                         , type : 'org.bluetooth.service.generic_attribute'
                         }
              , '1802' : { name : 'Immediate Alert'
                         , type : 'org.bluetooth.service.immediate_alert'
                         }
              , '1803' : { name : 'Link Loss'
                         , type : 'org.bluetooth.service.link_loss'
                         }
              , '1804' : { name : 'Tx Power'
                         , type : 'org.bluetooth.service.tx_power'
                         }
              , '1805' : { name : 'Current Time Service'
                         , type : 'org.bluetooth.service.current_time'
                         }
              , '1806' : { name : 'Reference Time Update Service'
                         , type : 'org.bluetooth.service.reference_time_update'
                         }
              , '1807' : { name : 'Next DST Change Service'
                         , type : 'org.bluetooth.service.next_dst_change'
                         }
              , '1808' : { name : 'Glucose'
                         , type : 'org.bluetooth.service.glucose'
                         }
              , '1809' : { name : 'Health Thermometer'
                         , type : 'org.bluetooth.service.health_thermometer'
                         }
              , '180a' : { name : 'Device Information'
                         , type : 'org.bluetooth.service.device_information'
                         }
              , '180d' : { name : 'Heart Rate'
                         , type : 'org.bluetooth.service.heart_rate'
                         }
              , '180e' : { name : 'Phone Alert Status Service'
                         , type : 'org.bluetooth.service.phone_alert_service'
                         }
              , '180f' : { name : 'Battery Service'
                         , type : 'org.bluetooth.service.battery_service'
                         }
              , '1810' : { name : 'Blood Pressure'
                         , type : 'org.bluetooth.service.blood_pressuer'
                         }
              , '1811' : { name : 'Alert Notification Service'
                         , type : 'org.bluetooth.service.alert_notification'
                         }
              , '1812' : { name : 'Human Interface Device'
                         , type : 'org.bluetooth.service.human_interface_device'
                         }
              , '1813' : { name : 'Scan Parameters'
                         , type : 'org.bluetooth.service.scan_parameters'
                         }
              , '1814' : { name : 'Running Speed and Cadence'
                         , type : 'org.bluetooth.service.running_speed_and_cadence'
                         }
              , '1815' : { name : 'Cycling Speed and Cadence'
                         , type : 'org.bluetooth.service.cycling_speed_and_cadence'
                         }

// units
              , '2700' : { name : 'unitless'
                         , type : 'org.bluetooth.unit.unitless'
                         }
              , '2701' : { name : 'length (metre)'
                         , type : 'org.bluetooth.unit.length.metre'
                         }
              , '2702' : { name : 'mass (kilogram)'
                         , type : 'org.bluetooth.unit.mass.kilogram'
                         }
              , '2703' : { name : 'time (second)'
                         , type : 'org.bluetooth.unit.time.second'
                         }
              , '2704' : { name : 'electric current (ampere)'
                         , type : 'org.bluetooth.unit.electric_current.ampere'
                         }
              , '2705' : { name : 'thermodynamic temperature (kelvin)'
                         , type : 'org.bluetooth.unit.thermodynamic_temperature.kelvin'
                         }
              , '2706' : { name : 'amount of substance (mole)'
                         , type : 'org.bluetooth.unit.amount_of_substance.mole'
                         }
              , '2707' : { name : 'luminous intensity (candela)'
                         , type : 'org.bluetooth.unit.luminous_intensity.candela'
                         }
              , '2710' : { name : 'area (square metres)'
                         , type : 'org.bluetooth.unit.area.square_metres'
                         }
              , '2711' : { name : 'volume (cubic metres)'
                         , type : 'org.bluetooth.unit.volume.cubic_metres'
                         }
              , '2712' : { name : 'velocity (metres per second)'
                         , type : 'org.bluetooth.unit.velocity.metres_per_second'
                         }
              , '2713' : { name : 'acceleration (metres per second squared)'
                         , type : 'org.bluetooth.unit.acceleration.metres_per_second_squared'
                         }
              , '2714' : { name : 'wavenumber (reciprocal metre)'
                         , type : 'org.bluetooth.unit.wavenumber.reciprocal_metre'
                         }
              , '2715' : { name : 'density (kilogram per cubic metre)'
                         , type : 'org.bluetooth.unit.density.kilogram_per_cubic_metre'
                         }
              , '2716' : { name : 'surface density (kilogram per square metre)'
                         , type : 'org.bluetooth.unit.surface_density.kilogram_per_square_metre'
                         }
              , '2717' : { name : 'specific volume (cubic metre per kilogram)'
                         , type : 'org.bluetooth.unit.specific_volume.cubic_metre_per_kilogram'
                         }
              , '2718' : { name : 'current density (ampere per square metre)'
                         , type : 'org.bluetooth.unit.current_density.ampere_per_square_metre'
                         }
              , '2719' : { name : 'magnetic field strength (ampere per metre)'
                         , type : 'org.bluetooth.unit.magnetic_field_strength.ampere_per_metre'
                         }
              , '271A' : { name : 'amount concentration (mole per cubic metre)'
                         , type : 'org.bluetooth.unit.amount_concentration.mole_per_cubic_metre'
                         }
              , '271B' : { name : 'mass concentration (kilogram per cubic metre)'
                         , type : 'org.bluetooth.unit.mass_concentration.kilogram_per_cubic_metre'
                         }
              , '271C' : { name : 'luminance (candela per square metre)'
                         , type : 'org.bluetooth.unit.luminance.candela_per_square_metre'
                         }
              , '271D' : { name : 'refractive index'
                         , type : 'org.bluetooth.unit.refractive_index'
                         }
              , '271E' : { name : 'relative permeability'
                         , type : 'org.bluetooth.unit.relative_permeability'
                         }
              , '2720' : { name : 'plane angle (radian)'
                         , type : 'org.bluetooth.unit.plane_angle.radian'
                         }
              , '2721' : { name : 'solid angle (steradian)'
                         , type : 'org.bluetooth.unit.solid_angle.steradian'
                         }
              , '2722' : { name : 'frequency (hertz)'
                         , type : 'org.bluetooth.unit.frequency.hertz'
                         }
              , '2723' : { name : 'force (newton)'
                         , type : 'org.bluetooth.unit.force.newton'
                         }
              , '2724' : { name : 'pressure (pascal)'
                         , type : 'org.bluetooth.unit.pressure.pascal'
                         }
              , '2725' : { name : 'energy (joule)'
                         , type : 'org.bluetooth.unit.energy.joule'
                         }
              , '2726' : { name : 'power (watt)'
                         , type : 'org.bluetooth.unit.power.watt'
                         }
              , '2727' : { name : 'electric charge (coulomb)'
                         , type : 'org.bluetooth.unit.electric_charge.coulomb'
                         }
              , '2728' : { name : 'electric potential difference (volt)'
                         , type : 'org.bluetooth.unit.electric_potential_difference.volt'
                         }
              , '2729' : { name : 'capacitance (farad)'
                         , type : 'org.bluetooth.unit.capacitance.farad'
                         }
              , '272A' : { name : 'electric resistance (ohm)'
                         , type : 'org.bluetooth.unit.electric_resistance.ohm'
                         }
              , '272B' : { name : 'electric conductance (siemens)'
                         , type : 'org.bluetooth.unit.electric_conductance.siemens'
                         }
              , '272C' : { name : 'magnetic flex (weber)'
                         , type : 'org.bluetooth.unit.magnetic_flex.weber'
                         }
              , '272D' : { name : 'magnetic flex density (tesla)'
                         , type : 'org.bluetooth.unit.magnetic_flex_density.tesla'
                         }
              , '272E' : { name : 'inductance (henry)'
                         , type : 'org.bluetooth.unit.inductance.henry'
                         }
              , '272F' : { name : 'Celsius temperature (degree Celsius)'
                         , type : 'org.bluetooth.unit.thermodynamic_temperature.degree_celsius'
                         }
              , '2730' : { name : 'luminous flux (lumen)'
                         , type : 'org.bluetooth.unit.luminous_flux.lumen'
                         }
              , '2731' : { name : 'illuminance (lux)'
                         , type : 'org.bluetooth.unit.illuminance.lux'
                         }
              , '2732' : { name : 'activity referred to a radionuclide (becquerel)'
                         , type : 'org.bluetooth.unit.activity_referred_to_a_radionuclide.becquerel'
                         }
              , '2733' : { name : 'absorbed dose (gray)'
                         , type : 'org.bluetooth.unit.absorbed_dose.gray'
                         }
              , '2734' : { name : 'dose equivalent (sievert)'
                         , type : 'org.bluetooth.unit.dose_equivalent.sievert'
                         }
              , '2735' : { name : 'catalytic activity (katal)'
                         , type : 'org.bluetooth.unit.catalytic_activity.katal'
                         }
              , '2740' : { name : 'dynamic viscosity (pascal second)'
                         , type : 'org.bluetooth.unit.dynamic_viscosity.pascal_second'
                         }
              , '2741' : { name : 'moment of force (newton metre)'
                         , type : 'org.bluetooth.unit.moment_of_force.newton_metre'
                         }
              , '2742' : { name : 'surface tension (newton per metre)'
                         , type : 'org.bluetooth.unit.surface_tension.newton_per_metre'
                         }
              , '2743' : { name : 'angular velocity (radian per second)'
                         , type : 'org.bluetooth.unit.angular_velocity.radian_per_second'
                         }
              , '2744' : { name : 'angular acceleration (radian per second squared)'
                         , type : 'org.bluetooth.unit.angular_acceleration.radian_per_second_squared'
                         }
              , '2745' : { name : 'heat flux density (watt per square metre)'
                         , type : 'org.bluetooth.unit.heat_flux_density.watt_per_square_metre'
                         }
              , '2746' : { name : 'heat capacity (joule per kelvin)'
                         , type : 'org.bluetooth.unit.heat_capacity.joule_per_kelvin'
                         }
              , '2747' : { name : 'specific heat capacity (joule per kilogram kelvin)'
                         , type : 'org.bluetooth.unit.specific_heat_capacity.joule_per_kilogram_kelvin'
                         }
              , '2748' : { name : 'specific energy (joule per kilogram)'
                         , type : 'org.bluetooth.unit.specific_energy.joule_per_kilogram'
                         }
              , '2749' : { name : 'thermal conductivity (watt per metre kelvin)'
                         , type : 'org.bluetooth.unit.thermal_conductivity.watt_per_metre_kelvin'
                         }
              , '274A' : { name : 'energy density (joule per cubic metre)'
                         , type : 'org.bluetooth.unit.energy_density.joule_per_cubic_metre'
                         }
              , '274B' : { name : 'electric field strength (volt per metre)'
                         , type : 'org.bluetooth.unit.electric_field_strength.volt_per_metre'
                         }
              , '274C' : { name : 'electric charge density (coulomb per cubic metre)'
                         , type : 'org.bluetooth.unit.electric_charge_density.coulomb_per_cubic_metre'
                         }
              , '274D' : { name : 'surface charge density (coulomb per square metre)'
                         , type : 'org.bluetooth.unit.surface_charge_density.coulomb_per_square_metre'
                         }
              , '274E' : { name : 'electric flux density (coulomb per square metre)'
                         , type : 'org.bluetooth.unit.electric_flux_density.coulomb_per_square_metre'
                         }
              , '274F' : { name : 'permittivity (farad per metre)'
                         , type : 'org.bluetooth.unit.permittivity.farad_per_metre'
                         }
              , '2750' : { name : 'permeability (henry per metre)'
                         , type : 'org.bluetooth.unit.permeability.henry_per_metre'
                         }
              , '2751' : { name : 'molar energy (joule per mole)'
                         , type : 'org.bluetooth.unit.molar_energy.joule_per_mole'
                         }
              , '2752' : { name : 'molar entropy (joule per mole kelvin)'
                         , type : 'org.bluetooth.unit.molar_entropy.joule_per_mole_kelvin'
                         }
              , '2753' : { name : 'exposure (coulomb per kilogram)'
                         , type : 'org.bluetooth.unit.exposure.coulomb_per_kilogram'
                         }
              , '2754' : { name : 'absorbed dose rate (gray per second)'
                         , type : 'org.bluetooth.unit.absorbed_dose_rate.gray_per_second'
                         }
              , '2755' : { name : 'radiant intensity (watt per steradian)'
                         , type : 'org.bluetooth.unit.radiant_intensity.watt_per_steradian'
                         }
              , '2756' : { name : 'radiance (watt per square meter steradian)'
                         , type : 'org.bluetooth.unit.radiance.watt_per_square_meter_steradian'
                         }
              , '2757' : { name : 'catalytic activity concentration (katal per cubic metre)'
                         , type : 'org.bluetooth.unit.catalytic_activity_concentration.katal_per_cubic_metre'
                         }
              , '2760' : { name : 'time (minute)'
                         , type : 'org.bluetooth.unit.time.minute'
                         }
              , '2761' : { name : 'time (hour)'
                         , type : 'org.bluetooth.unit.time.hour'
                         }
              , '2762' : { name : 'time (day)'
                         , type : 'org.bluetooth.unit.time.day'
                         }
              , '2763' : { name : 'plane angle (degree)'
                         , type : 'org.bluetooth.unit.plane_angle.degree'
                         }
              , '2764' : { name : 'plane angle (minute)'
                         , type : 'org.bluetooth.unit.plane_angle.minute'
                         }
              , '2765' : { name : 'plane angle (second)'
                         , type : 'org.bluetooth.unit.plane_angle.second'
                         }
              , '2766' : { name : 'area (hectare)'
                         , type : 'org.bluetooth.unit.area.hectare'
                         }
              , '2767' : { name : 'volume (litre)'
                         , type : 'org.bluetooth.unit.volume.litre'
                         }
              , '2768' : { name : 'mass (tonne)'
                         , type : 'org.bluetooth.unit.mass.tonne'
                         }
              , '2780' : { name : 'pressure (bar)'
                         , type : 'org.bluetooth.unit.pressure.bar'
                         }
              , '2781' : { name : 'pressure (millimetre of mercury)'
                         , type : 'org.bluetooth.unit.pressure.millimetre_of_mercury'
                         }
              , '2782' : { name : 'length (ångström)'
                         , type : 'org.bluetooth.unit.length.ångström'
                         }
              , '2783' : { name : 'length (nautical mile)'
                         , type : 'org.bluetooth.unit.length.nautical_mile'
                         }
              , '2784' : { name : 'area (barn)'
                         , type : 'org.bluetooth.unit.area.barn'
                         }
              , '2785' : { name : 'velocity (knot)'
                         , type : 'org.bluetooth.unit.velocity.knot'
                         }
              , '2786' : { name : 'logarithmic radio quantity (neper)'
                         , type : 'org.bluetooth.unit.logarithmic_radio_quantity.neper'
                         }
              , '2787' : { name : 'logarithmic radio quantity (bel)'
                         , type : 'org.bluetooth.unit.logarithmic_radio_quantity.bel'
                         }
              , '27A0' : { name : 'length (yard)'
                         , type : 'org.bluetooth.unit.length.yard'
                         }
              , '27A1' : { name : 'length (parsec)'
                         , type : 'org.bluetooth.unit.length.parsec'
                         }
              , '27A2' : { name : 'length (inch)'
                         , type : 'org.bluetooth.unit.length.inch'
                         }
              , '27A3' : { name : 'length (foot)'
                         , type : 'org.bluetooth.unit.length.foot'
                         }
              , '27A4' : { name : 'length (mile)'
                         , type : 'org.bluetooth.unit.length.mile'
                         }
              , '27A5' : { name : 'pressure (pound-force per square inch)'
                         , type : 'org.bluetooth.unit.pressure.pound_force_per_square_inch'
                         }
              , '27A6' : { name : 'velocity (kilometre per hour)'
                         , type : 'org.bluetooth.unit.velocity.kilometre_per_hour'
                         }
              , '27A7' : { name : 'velocity (mile per hour)'
                         , type : 'org.bluetooth.unit.velocity.mile_per_hour'
                         }
              , '27A8' : { name : 'angular velocity (revolution per minute)'
                         , type : 'org.bluetooth.unit.angular_velocity.revolution_per_minute'
                         }
              , '27A9' : { name : 'energy (gram calorie)'
                         , type : 'org.bluetooth.unit.energy.gram_calorie'
                         }
              , '27AA' : { name : 'energy (kilogram calorie)'
                         , type : 'org.bluetooth.unit.energy.kilogram_calorie'
                         }
              , '27AB' : { name : 'energy (kilowatt hour)'
                         , type : 'org.bluetooth.unit.energy.kilowatt_hour'
                         }
              , '27AC' : { name : 'thermodynamic temperature (degree Fahrenheit)'
                         , type : 'org.bluetooth.unit.thermodynamic_temperature.degree_fahrenheit'
                         }
              , '27AD' : { name : 'percentage'
                         , type : 'org.bluetooth.unit.percentage'
                         }
              , '27AE' : { name : 'per mille'
                         , type : 'org.bluetooth.unit.per_mille'
                         }
              , '27AF' : { name : 'period (beats per minute)'
                         , type : 'org.bluetooth.unit.period.beats_per_minute'
                         }
              , '27B0' : { name : 'electric charge (ampere hours)'
                         , type : 'org.bluetooth.unit.electric_charge.ampere_hours'
                         }
              , '27B1' : { name : 'mass density (milligram per decilitre)'
                         , type : 'org.bluetooth.unit.mass_density.milligram_per_decilitre'
                         }
              , '27B2' : { name : 'mass density (millimole per litre)'
                         , type : 'org.bluetooth.unit.mass_density.millimole_per_litre'
                         }
              , '27B3' : { name : 'time (year)'
                         , type : 'org.bluetooth.unit.time.year'
                         }
              , '27B4' : { name : 'time (month)'
                         , type : 'org.bluetooth.unit.time.month'
                         }

// profile attribute types
              , '2800' : { name : 'GATT Primary Service Declaration'
                         , type : 'org.bluetooth.attribute.gatt.primary_service_declaration'
                         }
              , '2801' : { name : 'GATT Secondary Service Declaration'
                         , type : 'org.bluetooth.attribute.gatt.secondary_service_declaration'
                         }
              , '2802' : { name : 'GATT Include Declaration'
                         , type : 'org.bluetooth.attribute.gatt.include_declaration'
                         }
              , '2803' : { name : 'GATT Characteristic Declaration'
                         , type : 'org.bluetooth.attribute.gatt.characteristic_declaration'
                         }

// descriptors
              , '2900' : { name : 'Characteristic Extended Properties'
                         , type : 'org.bluetooth.descriptor.gatt.characteristic_extended_properties'
                         }
              , '2901' : { name : 'Characteristic User Description'
                         , type : 'org.bluetooth.descriptor.gatt.characteristic_user_description'
                         }
              , '2902' : { name : 'Client Characteristic Configuration'
                         , type : 'org.bluetooth.descriptor.gatt.client_characteristic_configuration'
                         }
              , '2903' : { name : 'Server Characteristic Configuration'
                         , type : 'org.bluetooth.descriptor.gatt.server_characteristic_configuration'
                         }
              , '2904' : { name : 'Characteristic Presentation Format'
                         , type : 'org.bluetooth.descriptor.gatt.characteristic_presentation_format'
                         }
              , '2905' : { name : 'Characteristic Aggregate Format'
                         , type : 'org.bluetooth.descriptor.gatt.characteristic_aggregate_format'
                         }
              , '2906' : { name : 'Valid Range'
                         , type : 'org.bluetooth.descriptor.valid_range'
                         }
              , '2907' : { name : 'External Report Reference'
                         , type : 'org.bluetooth.descriptor.external_report_reference'
                         }
              , '2908' : { name : 'Report Reference'
                         , type : 'org.bluetooth.descriptor.report_reference'
                         }

// characteristics
              , '2a00' : { name : 'Device Name'
                         , type : 'org.bluetooth.characteristic.gap.device_name'
                         }
              , '2a01' : { name : 'Appearance'
                         , type : 'org.bluetooth.characteristic.gap.appearance'
                         }
              , '2a02' : { name : 'Peripheral Privacy Flag'
                         , type : 'org.bluetooth.characteristic.gap.peripheral_privacy_flag'
                         }
              , '2a03' : { name : 'Reconnection Address'
                         , type : 'org.bluetooth.characteristic.gap.reconnection_address'
                         }
              , '2a04' : { name : 'Peripheral Preferred Connection Parameters'
                         , type : 'org.bluetooth.characteristic.gap.peripheral_preferred_connection_parameters'
                         }
              , '2a05' : { name : 'Service Changed'
                         , type : 'org.bluetooth.characteristic.gatt.service_changed'
                         }
              , '2a06' : { name : 'Alert Level'
                         , type : 'org.bluetooth.characteristic.alert_level'
                         }
              , '2a07' : { name : 'Tx Power Level'
                         , type : 'org.bluetooth.characteristic.tx_power_level'
                         }
              , '2a08' : { name : 'Date Time'
                         , type : 'org.bluetooth.characteristic.date_time'
                         }
              , '2a09' : { name : 'Day of Week'
                         , type : 'org.bluetooth.characteristic.day_of_week'
                         }
              , '2a0a' : { name : 'Day Date Time'
                         , type : 'org.bluetooth.characteristic.day_date_time'
                         }
              , '2a0c' : { name : 'Exact Time 256'
                         , type : 'org.bluetooth.characteristic.exact_time_256'
                         }
              , '2a0d' : { name : 'DST Offset'
                         , type : 'org.bluetooth.characteristic.dst_offset'
                         }
              , '2a0e' : { name : 'Time Zone'
                         , type : 'org.bluetooth.characteristic.time_zone'
                         }
              , '2a0f' : { name : 'Local Time Information'
                         , type : 'org.bluetooth.characteristic.local_time_information'
                         }
              , '2a11' : { name : 'Time with DST'
                         , type : 'org.bluetooth.characteristic.time_with_dst'
                         }
              , '2a12' : { name : 'Time Accuracy'
                         , type : 'org.bluetooth.characteristic.time_accuracy'
                         }
              , '2a13' : { name : 'Time Source'
                         , type : 'org.bluetooth.characteristic.time_source'
                         }
              , '2a14' : { name : 'Reference Time Information'
                         , type : 'org.bluetooth.characteristic.reference_time_information'
                         }
              , '2a16' : { name : 'Time Update Control Point'
                         , type : 'org.bluetooth.characteristic.time_update_control_point'
                         }
              , '2a17' : { name : 'Time Update State'
                         , type : 'org.bluetooth.characteristic.time_update_state'
                         }
              , '2a18' : { name : 'Glucose Measurement'
                         , type : 'org.bluetooth.characteristic.glucose_measurement'
                         }
              , '2a19' : { name : 'Battery Level'
                         , type : 'org.bluetooth.characteristic.battery_level'
                         }
              , '2a1c' : { name : 'Temperature Measurement'
                         , type : 'org.bluetooth.characteristic.temperature_measurement'
                         }
              , '2a1d' : { name : 'Temperature Type'
                         , type : 'org.bluetooth.characteristic.temperature_type'
                         }
              , '2a1e' : { name : 'Intermediate Temperature'
                         , type : 'org.bluetooth.characteristic.intermediate_temperature'
                         }
              , '2a21' : { name : 'Measurement Interval'
                         , type : 'org.bluetooth.characteristic.measurement_interval'
                         }
              , '2a22' : { name : 'Boot Keyboard Input Report'
                         , type : 'org.bluetooth.characteristic.boot_keyboard_input_report'
                         }
              , '2a23' : { name : 'System ID'
                         , type : 'org.bluetooth.characteristic.system_id'
                         }
              , '2a24' : { name : 'Model Number String'
                         , type : 'org.bluetooth.characteristic.model_number_string'
                         }
              , '2a25' : { name : 'Serial Number String'
                         , type : 'org.bluetooth.characteristic.serial_number_string'
                         }
              , '2a26' : { name : 'Firmware Revision String'
                         , type : 'org.bluetooth.characteristic.firmware_revision_string'
                         }
              , '2a27' : { name : 'Hardware Revision String'
                         , type : 'org.bluetooth.characteristic.hardware_revision_string'
                         }
              , '2a28' : { name : 'Software Revision String'
                         , type : 'org.bluetooth.characteristic.software_revision_string'
                         }
              , '2a29' : { name : 'Manufacturer Name String'
                         , type : 'org.bluetooth.characteristic.manufacturer_name_string'
                         }
              , '2a2a' : { name : 'IEEE 11073-20601 Regulatory Certification Data List'
                         , type : 'org.bluetooth.characteristic.ieee_11073-20601_regulatory_certification_data_list'
                         }
              , '2a2b' : { name : 'Current Time'
                         , type : 'org.bluetooth.characteristic.current_time'
                         }
              , '2a31' : { name : 'Scan Refresh'
                         , type : 'org.bluetooth.characteristic.scan_refresh'
                         }
              , '2a32' : { name : 'Boot Keyboard Output Report'
                         , type : 'org.bluetooth.characteristic.boot_keyboard_output_report'
                         }
              , '2a33' : { name : 'Boot Mouse Input Report'
                         , type : 'org.bluetooth.characteristic.boot_mouse_input_report'
                         }
              , '2a34' : { name : 'Glucose Measurement Context'
                         , type : 'org.bluetooth.characteristic.glucose_measurement_context'
                         }
              , '2a35' : { name : 'Blood Pressure Measurement'
                         , type : 'org.bluetooth.characteristic.blood_pressure_measurement'
                         }
              , '2a36' : { name : 'Intermediate Cuff Pressure'
                         , type : 'org.bluetooth.characteristic.intermediate_blood_pressure'
                         }
              , '2a37' : { name : 'Heart Rate Measurement'
                         , type : 'org.bluetooth.characteristic.heart_rate_measurement'
                         }
              , '2a38' : { name : 'Body Sensor Location'
                         , type : 'org.bluetooth.characteristic.body_sensor_location'
                         }
              , '2a39' : { name : 'Heart Rate Control Point'
                         , type : 'org.bluetooth.characteristic.heart_rate_control_point'
                         }
              , '2a3f' : { name : 'Alert Status'
                         , type : 'org.bluetooth.characteristic.alert_status'
                         }
              , '2a40' : { name : 'Ringer Control Point'
                         , type : 'org.bluetooth.characteristic.ringer_control_point'
                         }
              , '2a41' : { name : 'Ringer Setting'
                         , type : 'org.bluetooth.characteristic.ringer_setting'
                         }
              , '2a42' : { name : 'Alert Category ID Bit Mask'
                         , type : 'org.bluetooth.characteristic.alert_category_id_bit_mask'
                         }
              , '2a43' : { name : 'Alert Category ID'
                         , type : 'org.bluetooth.characteristic.alert_category_id'
                         }
              , '2a44' : { name : 'Alert Notification Control Point'
                         , type : 'org.bluetooth.characteristic.alert_notification_control_point'
                         }
              , '2a45' : { name : 'Unread Alert Status'
                         , type : 'org.bluetooth.characteristic.unread_alert_status'
                         }
              , '2a46' : { name : 'New Alert'
                         , type : 'org.bluetooth.characteristic.new_alert'
                         }
              , '2a47' : { name : 'Supported New Alert Category'
                         , type : 'org.bluetooth.characteristic.supported_new_alert_category'
                         }
              , '2a48' : { name : 'Supported Unread Alert Category'
                         , type : 'org.bluetooth.characteristic.supported_unread_alert_category'
                         }
              , '2a49' : { name : 'Blood Pressure Feature'
                         , type : 'org.bluetooth.characteristic.blood_pressure_feature'
                         }
              , '2a4a' : { name : 'HID Information'
                         , type : 'org.bluetooth.characteristic.hid_information'
                         }
              , '2a4b' : { name : 'Report Map'
                         , type : 'org.bluetooth.characteristic.report_map'
                         }
              , '2a4c' : { name : 'HID Control Point'
                         , type : 'org.bluetooth.characteristic.hid_control_point'
                         }
              , '2a4d' : { name : 'Report'
                         , type : 'org.bluetooth.characteristic.report'
                         }
              , '2a4e' : { name : 'Protocol Mode'
                         , type : 'org.bluetooth.characteristic.protocol_mode'
                         }
              , '2a4f' : { name : 'Scan Interval Window'
                         , type : 'org.bluetooth.characteristic.scan_interval_window'
                         }
              , '2a50' : { name : 'PnP ID'
                         , type : 'org.bluetooth.characteristic.pnp_id'
                         }
              , '2a51' : { name : 'Glucose Feature'
                         , type : 'org.bluetooth.characteristic.glucose_feature'
                         }
              , '2a52' : { name : 'Record Access Control Point'
                         , type : 'org.bluetooth.characteristic.record_access_control_point'
                         }
              , '2a53' : { name : 'RSC Measurement'
                         , type : 'org.bluetooth.characteristic.rsc_measurement'
                         }
              , '2a54' : { name : 'RSC Feature'
                         , type : 'org.bluetooth.characteristic.rsc_feature'
                         }
              , '2a55' : { name : 'SC Control Point'
                         , type : 'org.bluetooth.characteristic.sc_control_point'
                         }
              , '2a5b' : { name : 'CSC Measurement'
                         , type : 'org.bluetooth.characteristic.csc_measurement'
                         }
              , '2a5c' : { name : 'CSC Feature'
                         , type : 'org.bluetooth.characteristic.csc_feature'
                         }
              , '2a5d' : { name : 'Sensor Location'
                         , type : 'org.bluetooth.characteristic.sensor_location'
                         }
               };

var pretty_value = function(v) {
  var i, u;

  u = v.toString('utf8');
  for (i = u.length - 2; i >= 0; i--) if (u[i] === '\0') return v.toString('hex');
  if (u[u.length - 1] === '\0') return u.substr(0, u.length - 1);
  if (v.toString('ascii') === u) return u;
  return v.toString('hex');
};

var peripheral_scan = function(peripheral, callback) {
  var ble, m, zero;

  peripheral.on('connect', function() {
    console.log('// connect: ' + peripheral.uuid + ' (' + peripheral.advertisement.localName + ')');
    peripheral.updateRssi();
  });

  peripheral.on('disconnect', function() {
    console.log('// disconnect: ' + peripheral.uuid + ' (' + peripheral.advertisement.localName + ')');
    if (zero !== 0) callback(ble);
  });

  peripheral.on('rssiUpdate', function(rssi) {
    console.log('// RSSI update: ' + rssi + ' (' + peripheral.advertisement.localName + ')');
    peripheral.discoverServices();
  });

  peripheral.on('servicesDiscover', function(services) {
    var i, s;

    var characteristicsDiscover = function(service) {
      return function(characteristics) {
        var c, j, n;

        zero += characteristics.length;
        for (j = 0; j < characteristics.length; j++) {
          c = characteristics[j];
          n = uuidmap[c.uuid] || { name: null, type: null};
          service.characteristics[c.uuid] = {name: n.name, type: n.type, properties: c.properties, descriptors: {},endpoint: c};
          c.on('descriptorsDiscover', descriptorsDiscover(service.characteristics[c.uuid]));
          c.discoverDescriptors();

          zero++;
          c.on('read', characteristicRead(service.characteristics[c.uuid]));
          c.read();
        }
        if (--zero === 0) callback(ble);
      };
    };

    var characteristicRead = function(characteristic) {
      return function(data, isNotification) {/* jshint unused: false */
        if (data !== undefined) characteristic.value = pretty_value(data);
        if (--zero === 0) callback(ble);
      };
    };

    var descriptorsDiscover = function(characteristic) {
      return function(descriptors) {
        var d, k, o;

        for (k = 0; k < descriptors.length; k++) {
          d = descriptors[k];
          o = uuidmap[d.uuid] || { name: null, type: null };
          characteristic.descriptors[d.uuid] = { name: o.name, type: o.type };
        }
        if (--zero === 0) callback(ble);
      };
    };

    ble = {};
    zero = services.length;
    for (i = 0; i < services.length; i++) {
      s = services[i];
      if (!s.uuid) continue;

      m = uuidmap[s.uuid] || { name: null, type: null};
      ble[s.uuid] = { name: m.name, type: m.type, characteristics: {} };
      s.on('characteristicsDiscover', characteristicsDiscover(ble[s.uuid]));
      s.discoverCharacteristics();
    }
    if (--zero === 0) callback(ble);
  });

  peripheral.connect();
};


noble.on('stateChange', function(state) {
  console.log('// stateChange: ' + state);

  if (state === 'poweredOn') noble.startScanning(); else noble.stopScanning();
});

noble.on('discover', function(peripheral) {
  if (!peripheral) {
    console.log('// null peripheral');
    return;
  }

  peripheral_scan(peripheral, function(ble) {
    var c, characteristic, s, service;

    for (service in ble) {
      if (!ble.hasOwnProperty(service)) continue;

      s = ble[service];
      for (characteristic in s.characteristics) {
        if (!s.characteristics.hasOwnProperty(characteristic)) continue;

        c = s.characteristics[characteristic];
        delete(c.endpoint);
        s.characteristics[characteristic] = JSON.stringify(c);
      }
    }

    console.log('{ "' + peripheral.uuid + '": ');
    console.log('  { localName: "' + peripheral.advertisement.localName + '",');
    console.log(util.inspect(ble, { depth: null }));
    console.log('  }');
    console.log('}');
  });
});
