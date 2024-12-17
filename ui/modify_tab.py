import platform
from typing import Optional, Dict
from copy import deepcopy

from PySide6.QtWidgets import(
    QWidget,
    QGridLayout,
    QHBoxLayout,
    QVBoxLayout,
    QPushButton,
    QVBoxLayout,
    QCheckBox,
    QDoubleSpinBox,
    QLabel,
    QGroupBox,
    QSizePolicy,
)
from PySide6.QtCore import(
    Qt,
    Signal
)

from data.constants import ALLOWED_RESAMPLING
from .widget_manager import WidgetManager
from core.utils import dictToList
from ui.combobox import ComboBox
from ui.spinbox import SpinBox, DoubleSpinBox
from ui.utils import setToolTip, createQHBoxLayout, blockSignals
from data.tooltips import TOOLTIPS

MAX_RES_PX = 999_999_999
MAX_FILE_SIZE = 1024**2   # KiB

class ModifyTab(QWidget):
    convert = Signal()

    def __init__(self, settings):
        super(ModifyTab, self).__init__()
        self.wm = WidgetManager("ModifyTab")

        # General setup
        self._setupWidgets()
        self._setupLayouts()
        self._setupTags()
        self._setupSignals()
        self._setToolTips()

        # Set Default
        self.resetToDefault()
        self.toggleDownscaleUI(False)
        self.wm.loadState()
        self.onModeChanged()

        # Apply Settings
        if settings["disable_downscaling_startup"]:
            self.disableDownscaling()
        self.toggleCustomResampling(settings["custom_resampling"])

        # Vars
        self.resample_visible = False
        self.cached_states = self.getSettings()
    
    def _setupWidgets(self):
        self.downscale_cb = self.wm.addWidget("downscale_cb", QCheckBox("Downscale"))
        self.mode_cmb = self.wm.addWidget("mode_cmb", ComboBox((
            "Resolution",
            "Percent",
            "Shortest Side",
            "Longest Side",
            "Megapixels",
            "File Size",
        )))
        self.mode_l = self.wm.addWidget("mode_l", QLabel("Scale to"))
        self.percent_l = self.wm.addWidget("percent_l", QLabel("Percent"))
        self.percent_sb = self.wm.addWidget("percent_sb", SpinBox())
        self.percent_sb.setRange(1, 99)
        self.percent_sb.setSuffix(" %")
        self.pixel_w_cb = self.wm.addWidget("pixel_w_cb", QCheckBox("Max Width"))
        self.pixel_w_sb = self.wm.addWidget("pixel_w_sb", SpinBox())
        self.pixel_w_sb.setRange(1, MAX_RES_PX)
        self.pixel_w_sb.setSuffix(" px")
        self.pixel_h_cb = self.wm.addWidget("pixel_h_cb", QCheckBox("Max Height"))
        self.pixel_h_sb = self.wm.addWidget("pixel_h_sb", SpinBox())
        self.pixel_h_sb.setRange(1, MAX_RES_PX)
        self.pixel_h_sb.setSuffix(" px")
        self.file_size_l = self.wm.addWidget("file_size_l", QLabel("File Size"))
        self.file_size_sb = self.wm.addWidget("file_size_sb", SpinBox())
        self.file_size_sb.setRange(1, MAX_FILE_SIZE)
        self.file_size_sb.setSuffix(" KiB")
        self.longest_l = self.wm.addWidget("longest_l", QLabel("Max Size"))
        self.longest_sb = self.wm.addWidget("longest_sb", SpinBox())
        self.longest_sb.setRange(1, MAX_RES_PX)
        self.longest_sb.setSuffix(" px")
        self.shortest_l = self.wm.addWidget("shortest_l", QLabel("Max Size"))
        self.shortest_sb = self.wm.addWidget("shortest_sb", SpinBox())
        self.shortest_sb.setRange(1, MAX_RES_PX)
        self.shortest_sb.setSuffix(" px")
        self.megapixels_l = self.wm.addWidget("megapixels_l", QLabel("Megapixels"))
        self.megapixels_sb = self.wm.addWidget("megapixels_sb", DoubleSpinBox())
        self.megapixels_sb.setRange(0.01, 9_999_999)
        self.megapixels_sb.setDecimals(2)
        self.megapixels_sb.setSuffix(" MP")
        self.resample_l = self.wm.addWidget("resample_l", QLabel("Resample"))
        self.resample_cmb = self.wm.addWidget("resample_cmb", ComboBox((
            "Default",
            *ALLOWED_RESAMPLING
        )))
        self.date_time_cb = self.wm.addWidget("date_time_cb", QCheckBox("Preserve Date && Time"))
        self.metadata_l = self.wm.addWidget("metadata_l", QLabel("Metadata"))
        self.metadata_cmb = self.wm.addWidget("metadata_cmb", ComboBox((
            "Encoder - Wipe",
            "Encoder - Preserve",
            "ExifTool - Wipe",
            "ExifTool - Preserve",
            "ExifTool - Unsafe Wipe",
            "ExifTool - Custom"
        )))
        self.default_btn = QPushButton("Reset to Default")
        self.convert_btn = QPushButton("Convert")

    def _setupLayouts(self):
        # Downscaling - general
        self.downscaling_lt = QVBoxLayout()
        self.downscaling_lt.addWidget(self.downscale_cb)
        downscale_grp = QGroupBox("Downscaling")
        downscale_grp.setLayout(self.downscaling_lt)

        self.downscaling_lt.addLayout(createQHBoxLayout(self.mode_l, self.mode_cmb))
        self.downscaling_lt.addLayout(createQHBoxLayout(self.percent_l, self.percent_sb))
        self.downscaling_lt.addLayout(createQHBoxLayout(self.pixel_w_cb, self.pixel_w_sb))
        self.downscaling_lt.addLayout(createQHBoxLayout(self.pixel_h_cb, self.pixel_h_sb))
        self.downscaling_lt.addLayout(createQHBoxLayout(self.file_size_l, self.file_size_sb))
        self.downscaling_lt.addLayout(createQHBoxLayout(self.longest_l, self.longest_sb))
        self.downscaling_lt.addLayout(createQHBoxLayout(self.shortest_l, self.shortest_sb))
        self.downscaling_lt.addLayout(createQHBoxLayout(self.megapixels_l, self.megapixels_sb))
        self.downscaling_lt.addLayout(createQHBoxLayout(self.resample_l, self.resample_cmb))

        # Misc. - general
        misc_grp = QGroupBox("Misc.")
        misc_grp_lt = QVBoxLayout()
        metadata_hb = createQHBoxLayout(self.metadata_l, self.metadata_cmb)
        misc_grp_lt.addWidget(self.date_time_cb)
        misc_grp_lt.addLayout(metadata_hb)
        misc_grp.setLayout(misc_grp_lt)

        # Main
        self.main_lt = QGridLayout()
        self.setLayout(self.main_lt)
        self.main_lt.addWidget(downscale_grp,0,0)
        self.main_lt.addWidget(misc_grp,0,1)
        self.main_lt.addWidget(self.default_btn,2,0)
        self.main_lt.addWidget(self.convert_btn,2,1)

        # Size policy
        self.main_lt.setAlignment(Qt.AlignTop)
        metadata_hb.setAlignment(Qt.AlignLeft)
        downscale_grp.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        misc_grp.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        self.metadata_cmb.setMinimumWidth(180)

    def _setupTags(self):
        self.wm.addTags("mode_cmb", "downscale_ui")
        self.wm.addTags("mode_l", "downscale_ui")
        self.wm.addTags("percent_l", "downscale_ui", "percent")
        self.wm.addTags("percent_sb", "downscale_ui", "percent")
        self.wm.addTags("pixel_h_cb", "downscale_ui", "pixel")
        self.wm.addTags("pixel_h_sb", "pixel")
        self.wm.addTags("pixel_w_cb", "downscale_ui", "pixel")
        self.wm.addTags("pixel_w_sb", "pixel")
        self.wm.addTags("file_size_l", "downscale_ui", "file_size")
        self.wm.addTags("file_size_sb", "downscale_ui", "file_size")
        self.wm.addTags("shortest_l", "downscale_ui", "shortest")
        self.wm.addTags("shortest_sb", "downscale_ui", "shortest")
        self.wm.addTags("longest_l", "downscale_ui", "longest")
        self.wm.addTags("longest_sb", "downscale_ui", "longest")
        self.wm.addTags("megapixels_l", "downscale_ui", "megapixels")
        self.wm.addTags("megapixels_sb", "downscale_ui", "megapixels")
        self.wm.addTags("resample_l", "downscale_ui", "resample")
        self.wm.addTags("resample_cmb", "downscale_ui", "resample")

    def _setupSignals(self):
        self.downscale_cb.stateChanged.connect(self.toggleDownscaleUI)
        self.mode_cmb.currentIndexChanged.connect(self.onModeChanged)
        self.default_btn.clicked.connect(self.resetToDefault)
        self.convert_btn.clicked.connect(self.convert.emit)
        self.pixel_w_cb.toggled.connect(self._onResWidthToggled)
        self.pixel_h_cb.toggled.connect(self._onResHeightToggled)

    def _setToolTips(self):
        setToolTip(TOOLTIPS["metadata"], self.metadata_cmb)
        if platform.system() == "Linux":
            setToolTip(TOOLTIPS["date_time_linux"], self.date_time_cb)
        else:
            setToolTip(TOOLTIPS["date_time"], self.date_time_cb)
        setToolTip(TOOLTIPS["downscaling"], self.downscale_cb)
        setToolTip(TOOLTIPS["downscaling_file_size"], self.file_size_sb)
        setToolTip(TOOLTIPS["downscaling_percent"], self.percent_sb)
        setToolTip(TOOLTIPS["downscaling_megapixels"], self.megapixels_sb)
        setToolTip(TOOLTIPS["downscaling_resolution_width_enabled"], self.pixel_w_cb)
        setToolTip(TOOLTIPS["downscaling_resolution_width"], self.pixel_w_sb)
        setToolTip(TOOLTIPS["downscaling_resolution_height_enabled"], self.pixel_h_cb)
        setToolTip(TOOLTIPS["downscaling_resolution_height"], self.pixel_h_sb)

    def _onResWidthToggled(self, enabled: bool) -> None:
        if self.downscale_cb.isEnabled():
            self.pixel_w_sb.setEnabled(enabled)
    
    def _onResHeightToggled(self, enabled: bool) -> None:
        if self.downscale_cb.isEnabled():
            self.pixel_h_sb.setEnabled(enabled)

    def toggleDownscaleUI(self, enabled: bool) -> None:
        self.wm.setEnabledByTag("downscale_ui", enabled)
        self._onResWidthToggled(self.pixel_w_cb.isChecked() if enabled else False)
        self._onResHeightToggled(self.pixel_h_cb.isChecked() if enabled else False)
    
    def disableDownscaling(self):
        self.downscale_cb.setChecked(False)

    def resetToDefault(self):
        self.metadata_cmb.setCurrentIndex(0)
        self.date_time_cb.setChecked(False)
        self.mode_cmb.setCurrentIndex(0)
        self.resample_cmb.setCurrentIndex(0)
        self.file_size_sb.setValue(300)
        self.percent_sb.setValue(80)
        self.pixel_w_sb.setValue(2000)
        self.pixel_h_sb.setValue(2000)
        self.shortest_sb.setValue(1080)
        self.longest_sb.setValue(1920)
        self.megapixels_sb.setValue(2.1)
        with blockSignals(self.pixel_w_cb, self.pixel_h_cb):
            self.pixel_w_cb.setChecked(True)
            self.pixel_h_cb.setChecked(True)
        
        self.disableDownscaling()
    
    def onModeChanged(self):
        """Enables or disables widgets based on the currently selected mode."""
        index = self.mode_cmb.currentText()
        self.wm.setVisibleByTag("pixel", index == "Resolution")
        self.wm.setVisibleByTag("percent", index == "Percent")
        self.wm.setVisibleByTag("file_size", index == "File Size")
        self.wm.setVisibleByTag("shortest", index == "Shortest Side")
        self.wm.setVisibleByTag("longest", index == "Longest Side")
        self.wm.setVisibleByTag("megapixels", index == "Megapixels")

    def _returnDownscalingEnabled(self) -> bool:
        if not self.downscale_cb.isChecked():
            return False
        
        if (
            self.mode_cmb.currentText() == "Resolution" and
            self.pixel_w_cb.isChecked() == False and 
            self.pixel_h_cb.isChecked() == False 
        ):
            return False
        
        return True
    
    def getSettings(self):
        return {
            "downscaling": {
                "enabled": self._returnDownscalingEnabled(),
                "mode": self.mode_cmb.currentText(),
                "percent": self.percent_sb.value(),
                "width": self.pixel_w_sb.value() if self.pixel_w_cb.isChecked() else float("inf"),
                "height": self.pixel_h_sb.value() if self.pixel_h_cb.isChecked() else float("inf"),
                "file_size": self.file_size_sb.value(),
                "shortest_side": self.shortest_sb.value(),
                "longest_side": self.longest_sb.value(),
                "megapixels": self.megapixels_sb.value(),
                "resample": self.getResampling(),
            },
            "misc": {
                "keep_metadata": self.metadata_cmb.currentText(),
                "attributes": self.date_time_cb.isChecked(),
            }
        }
    
    def saveState(self, new_states: Optional[Dict] = None) -> None:
        if new_states is None or new_states != self.cached_states:
            self.wm.saveState()
            self.cached_states = deepcopy(new_states)

    def getResampling(self):
        if self.resample_visible:
            return self.resample_cmb.currentText()
        else:
            return "Default"

    def toggleCustomResampling(self, enabled=False):
        self.resample_visible = enabled
        self.wm.setVisibleByTag("resample", enabled)