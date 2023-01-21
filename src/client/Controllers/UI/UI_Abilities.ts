import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle";
import { TextBlock, TextWrapping } from "@babylonjs/gui/2D/controls/textBlock";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { Image } from "@babylonjs/gui/2D/controls/image";
import Config from "../../../shared/Config";

export class UI_Abilities {

    private _playerUI;
    private _tooltip:Rectangle;
    private _tooltipTxt:TextBlock;
    private abylity_number: number = 10;

    constructor(_playerUI) {

        this._playerUI = _playerUI;

        // create ui
        this._createUI();

        // add ui events
        this._createEvents();

    }

    _createUI(){

        let width = 360;

        // add tooltip 
        const toolTipPanel = new Rectangle("toolTipPanel");
        toolTipPanel.top = "-190px";
        toolTipPanel.left = 0;
        toolTipPanel.width = width+"px";
        toolTipPanel.adaptHeightToChildren = true;
        toolTipPanel.thickness = 1;
        toolTipPanel.background = Config.UI_CENTER_PANEL_BG;
        toolTipPanel.isVisible = false;
        toolTipPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        toolTipPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this._playerUI.addControl(toolTipPanel);
        this._tooltip = toolTipPanel;

        // add tooltip text
        var toolTipText = new TextBlock("toolTipText");
        toolTipText.paddingTop = "5px";
        toolTipText.paddingBottom = "5px";
        toolTipText.paddingRight = "5px";
        toolTipText.paddingLeft = "5px";
        toolTipText.text = "NONE";
        toolTipText.fontSize = "12px";
        toolTipText.color = "#FFF";
        toolTipText.top = "0px";
        toolTipText.left = "0px";
        toolTipText.width = 1;
        toolTipText.textWrapping = TextWrapping.WordWrap;
        toolTipText.resizeToFit = true;
        toolTipText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        toolTipText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        toolTipPanel.addControl(toolTipText);
        this._tooltipTxt = toolTipText;

        // add stack panel
        const abilityPanel = new Rectangle("abilityPanel");
        abilityPanel.top = "-150px;"
        abilityPanel.width = width+"px";
        abilityPanel.adaptHeightToChildren = true;
        abilityPanel.thickness = 0;
        abilityPanel.background = Config.UI_CENTER_PANEL_BG;
        abilityPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        abilityPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this._playerUI.addControl(abilityPanel);

        for (let i = 1; i <= this.abylity_number; i++) {

            // calculate responsive width and height 
            let iconWidth = width / this.abylity_number;
            let leftMargin = i > 1 ?  ((i-1)*iconWidth)+"px" : "0px";
        
            // container
            var headlineRect = new Rectangle("ability_"+i);
            headlineRect.top = "0px";
            headlineRect.left = leftMargin;
            headlineRect.width = iconWidth+"px";
            headlineRect.height = iconWidth+"px";
            headlineRect.thickness = 1;
            headlineRect.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            headlineRect.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            abilityPanel.addControl(headlineRect);

            if(i === 1){
                var img = new Image("image1", "./icons/ABILITY_fireball.png")
                img.stretch = Image.STRETCH_FILL;
                headlineRect.addControl(img);

                headlineRect.onPointerEnterObservable.add(() => { 
                    this.showTooltip(headlineRect, 'fireball');
                });

                headlineRect.onPointerOutObservable.add(() => { 
                    this.hideTooltip();
                });
            }

            if(i === 2){
                var img = new Image("image2", "./icons/ABILITY_poisonball.png")
                img.stretch = Image.STRETCH_FILL;
                headlineRect.addControl(img);

                headlineRect.onPointerEnterObservable.add(() => { 
                    this.showTooltip(headlineRect, 'poisonball');
                });

                headlineRect.onPointerOutObservable.add(() => { 
                    this.hideTooltip();
                });
            }

            var roomTxt = new TextBlock('ability_text_'+i);
            roomTxt.paddingLeft = "5px";
            roomTxt.text = ""+i;
            roomTxt.fontSize = "12px";
            roomTxt.color = "#FFF";
            roomTxt.top = "5px";
            roomTxt.left = "0px";
            roomTxt.width = "20px";
            roomTxt.height = "15px";
            roomTxt.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            roomTxt.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            headlineRect.addControl(roomTxt);

        }

    }

    showTooltip(ui, key){
        let ability = Config.abilities[key];
        this._tooltip.isVisible = true;
        this._tooltipTxt.text = ability.description;
    }

    hideTooltip(){
        this._tooltip.isVisible = false;
    }

    _createEvents(){

    }

}