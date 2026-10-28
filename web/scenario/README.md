# Run-boundary illustration

The eight JPEGs are real, annotated-normal TSFabrics frames from two separate
production scenarios. `source-509.jpg` through `source-512.jpg` are adjacent
startup frames from `T1_S174_I111_1`. `target-001.jpg`, `target-064.jpg`,
`target-128.jpg`, and `target-192.jpg` are time-ordered frames from
`T1_S164_I36_1`, the all-normal changed scenario. Display numbers are one-based;
`manifest.json` records their zero-based archive indices.

The divider on the site marks the **experiment's switch between separate
recordings**. It is not an observed moment when a physical production line
changed. The first sustained feature-distribution alert is returned after the
first 192 target frames; the highlighted image is target index 191. Image
labels were checked for asset selection and are not used by the detector.

Regenerate the files with
`experiments/unsupervised/export_scenario_timeline.py` on the experiment server,
then copy `experiments/unsupervised/scenario_export/` into this directory.

Source: [TSFabrics](https://doi.org/10.6084/m9.figshare.29573381), CC BY 4.0.
